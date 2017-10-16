import rp from "request-promise";

const clientId = "bpZryvmLZYK9Def0s0iGkUhePPr8nUen";
const clientSecret = "pu7qU1_VH62VbVAC6XDxB1KvnrPDfUBggmpRM7ZR-UlPkJOVoc8oY-uYWpk_wUCx";
const apiUri = "https://api.imageintelligence.com/v1";

export const requestAuth = function () {
    const options = {
        method : "POST",
        uri : apiUri + "/oauth/token",
        body : {
            clientId,
            clientSecret
        },
        json: true
    };
    return rp(options)
    .then((data) => {
        return data.accessToken;
    });
};


export const requestFindPersonForJobId = async function (items, jobId) {
    const sessionToken = await requestAuth();
    const defaultOptions = {
        model: "CLASSIFIER_GEN_01",
        tolerance: "HIGH",
        items: items.map((item, idx) => {
            return {
                url: item,
                customId: `${jobId}+${idx}`,
            };
        }),
    };

    const options = {
        method : "POST",
        uri : apiUri + "/find-person",
        body : defaultOptions,
        headers: {
            Authorization: `Bearer ${sessionToken}`,
        },
        json: true
    };
    return rp(options)
    .then((result) => {
        return result.id;
    });
};


export const requestOneImageFindPersonForJobId = async function (image, jobId) {
    const sessionToken = await requestAuth();
    const defaultOptions = {
        model: "CLASSIFIER_GEN_01",
        tolerance: "HIGH",
        items: [{
            url:image['url'],
            customId:`${jobId}+${image['id']}`
        }],
    };

    const options = {
        method : "POST",
        uri : apiUri + "/find-person",
        body : defaultOptions,
        headers: {
            Authorization: `Bearer ${sessionToken}`,
        },
        json: true
    };
    return rp(options)
    .then((result) => {
        return result.id;
    });
};


export const getFindPersonResultForJobId = async function (jobId) {
    const sessionToken = await requestAuth();
    const options = {
        method : "GET",
        uri : apiUri + `/find-person/${jobId}`,
        headers: {
            Authorization: `Bearer ${sessionToken}`,
        },
        json: true
    };
    return rp(options)
    .then((result) => {
        return result;
    });
};






