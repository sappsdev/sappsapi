import { go } from "../src";

go(async () => {
  await new Promise((res) => setTimeout(res, 1000));
  console.log("Async finished!");
});

go(() => {
  console.log("Sync finished!");
});

go(async () => {
  throw new Error("Async failed!");
});

go(() => {
  throw new Error("Sync failed!");
});
