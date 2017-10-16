import path from "path";
import views from "co-views";
// import parse from "co-body";
import instantTheme from "koa-instant-theme";
import db from "../db";

const render = views(path.resolve(__dirname, "../views"), {
    map: { html: "ejs" },
});

export default async function index(ctx) {
    const records = await db.execute("SELECT * FROM images ORDER BY timestamp ASC").spread((records) => {
        return records;
    });
    const body = await render("index", { records, recordsJSON:JSON.stringify(records) });
    ctx.body = instantTheme.header + body + instantTheme.footer;
}
