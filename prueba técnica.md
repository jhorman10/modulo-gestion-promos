# Prueba Técnica: Módulo de Gestión de Promociones

### 1. El Desafío

Los clientes de Kódigo Fuente configura constantemente promociones y descuentos para los productos que se venden en los POS. Actualmente esta configuración se lleva de forma manual, lo que genera errores como descuentos activos fuera de su vigencia o porcentajes mal aplicados.

Se requiere una aplicación web sencilla que permita **registrar y gestionar promociones**, controlando su estado y su vigencia.

---

### 2. Requerimientos Funcionales

**Gestión de Promociones**
- Crear una promoción con: nombre, producto o categoría asociada, tipo de descuento (`Porcentaje` o `Monto fijo`), valor del descuento, fecha de inicio y fecha de fin.
- Listar todas las promociones con sus datos principales.
- Cambiar el estado de una promoción: `Programada` → `Activa` → `Finalizada`.
- Eliminar una promoción (solo si está en estado `Programada`).

**Validaciones**
- No permitir crear una promoción sin nombre, producto/categoría ni valor de descuento.
- La `fecha de fin` debe ser posterior a la `fecha de inicio`.
- Si el tipo de descuento es `Porcentaje`, el valor debe estar entre 1 y 100.
- Una promoción en estado `Finalizada` no puede modificarse.

**Vista de resumen**
- Mostrar un contador simple por estado: cuántas promociones hay en `Programada`, `Activa` y `Finalizada`.
- Indicar cuántas promociones están vigentes **hoy** (fecha actual dentro del rango de vigencia).

---

### 3. Restricciones Técnicas (Libertad de Elección)

El candidato debe elegir las herramientas, pero debe justificar su elección en un archivo **`DECISIONS.md`**.

**Obligatorio:**
- **Frontend:** React + Vite.
- **Backend:** Node.js **o** Laravel.
- **Base de datos:** PostgreSQL, SQL Server o MongoDB — mínimo 2 tablas/colecciones.
- El proyecto debe levantarse con **`docker-compose up`**.
- El backend debe exponer un endpoint **`/health`** que responda `200 OK` cuando la aplicación y su conexión a base de datos estén operativas.

---

### 4. CI/CD — GitHub Actions (Obligatorio)

Configure un flujo de GitHub Actions que automatice, en etapas dependientes (`lint` → `test` → `build` → `smoke test`):

1. **Linter y pruebas unitarias.**
2. **Construcción de las imágenes Docker.** (backend y frontend)
3. **Smoke test de integración:** el pipeline debe levantar la aplicación (`docker compose up`), esperar a que los contenedores estén listos y verificar mediante una petición al endpoint **`/health`** que la aplicación responde correctamente. Si `/health` no responde `200`, el pipeline debe fallar.

**Manejo de secretos — obligatorio.**
- **No debe existir ningún secreto ni credencial en el repositorio** (contraseñas de base de datos, tokens, llaves, etc.).
- Debe incluirse un archivo **`.env.example`** con las variables necesarias, pero sin valores reales.
- Las variables sensibles deben inyectarse mediante **GitHub Secrets** / variables de entorno.
- El pipeline debe **fallar de forma explícita si falta alguna variable de entorno requerida.**

---

### 5. Entregables

- Repositorio **público en GitHub** con el código fuente.
- Archivo `DECISIONS.md` explicando las decisiones tecnológicas.
- Archivo `README.md` con los pasos para levantar el proyecto localmente.
- Archivo `.env.example` con las variables requeridas (sin valores reales).
- Flujo de GitHub Actions funcional y visible en la pestaña **Actions** del repositorio.

---

> **Nota sobre el alcance:** el objetivo no es una aplicación extensa. Prioriza la calidad sobre la cantidad. 

> "no importa si el gato es blanco o negro siempre y cuando cace ratones"