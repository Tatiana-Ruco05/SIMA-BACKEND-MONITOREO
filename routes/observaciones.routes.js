import { Router } from "express"; 
import { crearObservacion, obtenerObservaciones } from "../controllers/observaciones.controller.js";
const router = Router();
router.post("/", crearObservacion);
router.get("/", obtenerObservaciones);
export default router;

