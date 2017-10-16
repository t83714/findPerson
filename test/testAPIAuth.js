import {assert} from "chai";
import { requestAuth } from "../src/ImageAPIUtils.js";


const getResult = async function (done) {
    const result = await requestAuth();
    console.log(result);
    assert.typeOf(tokoen, "string");
    done();
};

describe("Test requestAuth", function() {
    it("Should return session token", function(done) {
        getResult(done);
    });
});