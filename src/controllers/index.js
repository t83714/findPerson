import path from "path";
import views from "co-views";
// import parse from "co-body";
import instantTheme from "koa-instant-theme";
import db from "../db";

const render = views(path.resolve(__dirname, "../views"), {
    map: { html: "ejs" },
});

export default async function index(ctx, id) {
    if (!id) id = 0;
    const records = await db.execute("SELECT * FROM parking_zones LIMIT ?,50", [id]).spread((records) => {
        return records;
    });

    const body = await render("index", { records });
    ctx.body = instantTheme.header + body + instantTheme.footer;
}
