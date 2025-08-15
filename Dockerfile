# Imagen base con Node.js LTS
FROM node:18

# Carpeta de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json primero (para aprovechar la caché de Docker)
COPY package*.json ./

# Instalar dependencias 
RUN npm install 

# Copiar el resto del código
COPY . .

# Exponer el puerto 
EXPOSE 4000

# Comando para iniciar la API
CMD ["node", "src/server.js"]
