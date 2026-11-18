"use strict";
const engine = require("../../../apps/site/public/board-games/terrorscape/engine.js");
const { chooseBotAction } = require("./bot");

module.exports = { ...engine, chooseBotAction };
