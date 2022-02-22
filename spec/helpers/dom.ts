import * as jsdom from "jsdom";

export const dom = new jsdom.JSDOM("<!DOCTYPE html>", { url: "http://localhost" });

global["window"] = dom.window as any;
global["document"] = dom.window.document;
global["location"] = dom.window.location;
global["Document"] = dom.window.Document;
