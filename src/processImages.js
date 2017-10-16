import rp from "request-promise";
import uuidv4 from "uuid/v4";
import moment from "moment";
import db from "./db";
import { requestFindPersonForJobId } from "./ImageAPIUtils";


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



const getResult = async function () {
    let items;
    try{
        items = await getDataFromCSV();
    }catch(e){
        console.log(`Failed to get CSV data: ${e.message}`);
    }

    try{
        let savedNum = await saveImagesToDB(items);
    }catch(e){
        console.log(`Failed to write CSV data to DB: ${e.message}`);
    }

    process.exit();

    /*
    try{
        items = itemsToChunk(items);
    }catch(e){
        console.log(`Failed to cut CSV data to 128 chunk: ${e.message}`);
    }*/

    const jobIds = [];
    const taskId = uuidv4();
    try{
        for(let i=0;i<items.length;i++){
            let jobId = await requestFindPersonForJobId(items[i], `${taskId}+${i}`);
            jobIds.push(jobId);
        }
    }catch(e){
        console.log(`Failed to submit job: ${e.message}`);
    }

    console.log(jobIds);
};
getResult();

//console.log(parseImageTimestampFromURL('http://www.homescript.io/images/2017-09-21T08:23:16.418Z.jpg'));

