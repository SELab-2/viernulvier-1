import type { FastifyInstance } from "fastify";

import { replyHandler } from "@/routes/helpers.js";
import { 
    createEventPrice,
    deleteEventPrice,   
    fetchEventPrice, 
    fetchEventPrices, 
    fetchEventPriceWithMeta, 
    replaceEventPrice, 
    editEventPrice,
 } from "./handlers/index.js";