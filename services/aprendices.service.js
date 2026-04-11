export const obtenerAprendices = async () => {
  try {
    const res = await fetch("http://localhost:3000/api/aprendices");
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error obteniendo aprendices:", error);
    return [];
  }
};
