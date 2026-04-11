import { Router } from "express";

const router = Router();


router.get("/", (req, res) => {
  res.json([
    { id_aprendiz: 1, nombre: "Pacho" },
    { id_aprendiz: 2, nombre: "James Rodriguez" }
  ]);
});

export default router;



