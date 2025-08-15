# Imagen base con Node.js LTS
FROM node:18

# Carpeta de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json primero (para aprovechar la caché de Docker)
COPY package*.json ./

# Instalar dependencias (solo producción para más rapidez)
RUN npm install --only=production

# Copiar el resto del código
COPY . .

# Exponer el puerto (Fly.io asignará process.env.PORT)
EXPOSE 4000

# Comando para iniciar la API
CMD ["node", "server.js"]
