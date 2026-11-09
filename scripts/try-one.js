"use strict";
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
var ime_1 = require("@/lib/ime");
var rows = await (0, ime_1.fetchImeTradeData)("1405/08/02", "1405/08/08", 0, 1);
console.log("rows:", rows.length);
console.log("first:", (_a = rows[0]) === null || _a === void 0 ? void 0 : _a.GoodsName, (_b = rows[0]) === null || _b === void 0 ? void 0 : _b.date, (_c = rows[0]) === null || _c === void 0 ? void 0 : _c.Category);
