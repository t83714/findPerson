import mysql2 from "mysql2";
import dbWarapper from "mysql2-promise";

const db = dbWarapper();
const opts = {
    connectionLimit: 5,
    host: "localhost",
    user: "root",
    password: "",
    database: "findperson",
};

db.configure(opts, mysql2);

export default db;
