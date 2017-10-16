import rp from "request-promise";
import uuidv4 from "uuid/v4";
import moment from "moment";
import sleep from 'sleep-promise';
import db from "./db";
import { 
    requestFindPersonForJobId,
    requestOneImageFindPersonForJobId,
    getFindPersonResultForJobId
} from "./ImageAPIUtils";


const maxItemsNum = 128;
const csvURL = "http://www.homescript.io/images/snapshots.csv";

const getDataFromCSV =function () {
    return rp(csvURL)
    .then((content)=>{
        return content.split(/\s/);
    });
};

function itemsToChunk(items)
{
    const newData = [];
    for(let i=0; i<items.length;){
        let end = i+maxItemsNum;
        if(end>items.length+1) end=items.length+1;
        let newArray=items.slice(i,end);
        if(newArray) newData.push(newArray);
        i=end-1;
    }
    return newData;
}

function parseImageTimestampFromURL(url)
{
    const parts =url.replace(/\.jpg$/, "").split(/\//);
    const timeStr = parts[parts.length-1];//2017-09-21T08:23:16.418Z
    if(!timeStr.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)) return 0;
    const m = new moment(timeStr);
    if(!m.isValid()) throw new Error(`Invalid timestring: ${timeStr}`);
    return m.format("x");
}

const saveImagesToDB = async function (items) {
    let count = 0;
    for (let i = 0; i<items.length; i++ ){
        const records = await db.execute("SELECT id FROM images WHERE url=? LIMIT 1", [items[i]]).spread((records) => {
            return records;
        });
        if( records.length) continue;
        
        const sql="INSERT INTO `images` (`id`, `url`, `timestamp`, `has_person`, `result_update_time`) values (NULL,?,?, '0', '0');";
        let timestamp;
        try{
            timestamp=parseImageTimestampFromURL(items[i])
        }catch(e){
            console.log(`Skip: Invalid time string in URL: ${items[i]}`);
            timestamp=0;
        }
        if(!timestamp) {
            console.log(`Skip ULR: ${items[i]}`);
            continue;
        }
        const params=[items[i],timestamp];
        const result = await db.execute(sql, params).spread((result) => {
            return result;
        });
        count++;
    }
    return count;
};

const getTotalImageNum = async function () {
    const totalNum = await db.query("SELECT COUNT(*) as total_num FROM images").spread((records) => {
        return records[0].total_num;
    });
    return totalNum;
};

const updateImageHasPersonStatus = async function (id, hasPerson, data) {
    const sql="UPDATE `images` SET `has_person` = ?, `result_update_time` = UNIX_TIMESTAMP(), `confidence`=?, `data`=? WHERE `images`.`id` = ?;";
    const params=[hasPerson?1:0,data.confidence,JSON.stringify(data),id];
    const result = await db.execute(sql, params).spread((result) => {
        return result;
    });
};

const queryImageProcessingResult = async function (allDbImages) {
    let pendingItems=0;
    try{
        for(let i=0;i<allDbImages.length;i++){
            if(allDbImages[i].result && allDbImages[i].result.processed) continue;
            pendingItems++;
            let result = await getFindPersonResultForJobId(allDbImages[i]['jobId']);
            allDbImages[i]['result']={
                processed: result.status.code=='COMPLETED_SUCCESSFULLY'?true:false,
                hasPerson: result.results[0].hasPerson,
                data: result.results[0]
            };
            if(allDbImages[i]['result']['processed'] || allDbImages[i]['result']['hasPerson']){
                await updateImageHasPersonStatus(allDbImages[i]['id'],allDbImages[i]['result']['hasPerson'],allDbImages[i]['result']['data']);
            }
        }
    }catch(e){
        console.log(`Failed to submit job: ${e.message}`);
    }
    return pendingItems;
};


const getResult = async function () {
    let items;
    try{
        items = await getDataFromCSV();
    }catch(e){
        console.log(`Failed to get CSV data: ${e.message}`);
        throw e;
    }

    try{
        let savedNum = await saveImagesToDB(items);
    }catch(e){
        console.log(`Failed to write CSV data to DB: ${e.message}`);
        throw e;
    }

    let totalImageNum = await getTotalImageNum();
    let allDbImages;

    try{
        allDbImages = await db.execute("SELECT * FROM images WHERE `result_update_time`=0").spread((records) => {
            return records;
        });
    }catch(e){
        console.log(`Failed to load images from DB: ${e.message}`);
    }

    const taskId = uuidv4();
    try{
        for(let i=0;i<allDbImages.length;i++){
            let jobId = await requestOneImageFindPersonForJobId(allDbImages[i], taskId);
            allDbImages[i]['jobId']=jobId;
        }
    }catch(e){
        console.log(`Failed to submit job: ${e.message}`);
    }

    let pendingItems=0;
    do{
        pendingItems = await queryImageProcessingResult(allDbImages);
        if(pendingItems){
            await sleep(500);
        }
    }while(pendingItems);
    
    console.log("All job processed!");
};

(async () => {
    await getResult();
})();


//console.log(parseImageTimestampFromURL('http://www.homescript.io/images/2017-09-21T08:23:16.418Z.jpg'));

