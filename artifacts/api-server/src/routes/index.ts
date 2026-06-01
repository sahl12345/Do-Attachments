import { Router, type IRouter } from "express";
import healthRouter from "./health";
import onlineSessionsRouter from "./onlineSessions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(onlineSessionsRouter);

export default router;
