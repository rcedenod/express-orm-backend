const PersonBO = class {

    constructor() {}

    async getPeople(params){
        try {
            const result = await database.executeQuery("public", "getPeople", []);
        
            if (!result || !result.rows) {
              console.error("La consulta no devolvio resultados");
              return { sts: false, msg: "Error al obtener personas" };
            }
        
            return { sts: true, data: result.rows };
          } catch (error) {
            console.error("Error en getPeople:", error);
            return { sts: false, msg: "Error al ejecutar la consulta" };
          }
    }
}

module.exports = PersonBO;