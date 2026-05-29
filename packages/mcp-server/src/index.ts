#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "init":
    console.log("Topos init — coming soon");
    break;
  case "serve":
    console.log("Topos serve — coming soon");
    break;
  default:
    console.log("Usage: topos <init|serve|skill>");
}
