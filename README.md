# 🏋️ Workout Tracker

**Entrena con datos, no con suposiciones.**  
Workout Tracker es una aplicación web que convierte cada set que haces en métricas reales de progreso.

Diseñada para personas que entrenan con pesas y quieren mejorar fuerza, volumen y consistencia usando datos, no memoria.

---

## 🚀 Qué hace

Workout Tracker te permite:

- Crear mesociclos de entrenamiento
- Registrar cada set (peso, reps, día y semana)
- Calcular automáticamente:
  - PRs por ejercicio
  - Volumen total
  - Progreso diario
  - Comparación entre mesociclos
- Visualizar tu progreso en gráficos claros

No es una app de “checklists”.  
Es una **herramienta de feedback para mejorar tu entrenamiento**.

---

## 🧠 Por qué existe

La mayoría de apps solo guardan datos.

Workout Tracker los convierte en decisiones:
- ¿Estoy progresando?
- ¿Este mesociclo funcionó?
- ¿Qué ejercicios me están dando más retorno?

Si no puedes responder eso, estás entrenando a ciegas.

---

## 🛠️ Stack

- **Frontend**
  - HTML + CSS
  - Vanilla JavaScript
  - Chart.js

- **Backend**
  - Supabase
  - PostgreSQL
  - Views materializadas para estadísticas

- **Auth**
  - Supabase Auth

---

## 📦 Funcionalidades

- Autenticación de usuarios
- Gestión de mesociclos
- Plantillas de ejercicios
- Registro por semana y día
- Edición y borrado de sets
- Estadísticas avanzadas
- Gráficos de progreso
- PRs automáticos

---

## 🧪 En desarrollo

Próximas funciones:

- Exportar datos
- Rutinas recomendadas por progresión
- Detección de estancamiento
- Notificaciones
- Versión móvil

---

## 🧠 Filosofía

> “Si no puedes medirlo, no puedes mejorarlo.”

Workout Tracker no está diseñado para principiantes casuales.  
Está diseñado para personas que quieren progresar de verdad.

---

## 🔐 Seguridad

El acceso a los datos está protegido por Row Level Security (RLS) en Supabase.
Cada usuario solo ve y modifica sus propios registros.

