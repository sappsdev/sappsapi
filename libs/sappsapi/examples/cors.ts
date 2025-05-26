import { App } from "../src";

const app = new App({
  port: 3000,
  cors: true,
});

const app2 = new App({
  port: 3000,
  cors: {
    origin: "https://frontend.com",
    methods: "GET, POST, PUT",
    headers: "Content-Type, Authorization",
  },
});
