// Archivo: verificar-env.js - Ejecuta esto temporalmente para verificar tus credenciales

require('dotenv').config();

console.log('=== VERIFICACIÓN DE VARIABLES DE ENTORNO CLOUDINARY ===\n');

console.log('1. CLOUDINARY_CLOUD_NAME:');
console.log('   Existe:', !!process.env.CLOUDINARY_CLOUD_NAME);
if (process.env.CLOUDINARY_CLOUD_NAME) {
  console.log('   Primeros caracteres:', process.env.CLOUDINARY_CLOUD_NAME.substring(0, 8) + '...');
  console.log('   Es alfanumérico:', /^[a-z0-9_-]+$/i.test(process.env.CLOUDINARY_CLOUD_NAME));
}

console.log('\n2. CLOUDINARY_API_KEY:');
console.log('   Existe:', !!process.env.CLOUDINARY_API_KEY);
if (process.env.CLOUDINARY_API_KEY) {
  console.log('   Primeros caracteres:', process.env.CLOUDINARY_API_KEY.substring(0, 6) + '...');
  console.log('   Es solo numérico:', /^\d+$/.test(process.env.CLOUDINARY_API_KEY));
  console.log('   Longitud:', process.env.CLOUDINARY_API_KEY.length, 'caracteres');
}

console.log('\n3. CLOUDINARY_API_SECRET:');
console.log('   Existe:', !!process.env.CLOUDINARY_API_SECRET);
if (process.env.CLOUDINARY_API_SECRET) {
  console.log('   Primeros caracteres:', process.env.CLOUDINARY_API_SECRET.substring(0, 6) + '...');
  console.log('   Contiene letras y números:', /^[a-zA-Z0-9_-]+$/.test(process.env.CLOUDINARY_API_SECRET) && /[a-zA-Z]/.test(process.env.CLOUDINARY_API_SECRET) && /[0-9]/.test(process.env.CLOUDINARY_API_SECRET));
  console.log('   Longitud:', process.env.CLOUDINARY_API_SECRET.length, 'caracteres');
}

console.log('\n=== POSIBLE PROBLEMA DETECTADO ===');
if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  const keyIsNumeric = /^\d+$/.test(process.env.CLOUDINARY_API_KEY);
  const secretIsAlphanumeric = /[a-zA-Z]/.test(process.env.CLOUDINARY_API_SECRET);
  
  if (!keyIsNumeric && secretIsAlphanumeric) {
    console.log('⚠️  POSIBLE INTERCAMBIO: API_KEY debería ser numérico y API_SECRET alfanumérico');
    console.log('   Revisa si intercambiaste API_KEY y API_SECRET en tu archivo .env');
  } else if (keyIsNumeric && secretIsAlphanumeric) {
    console.log('✅ Las credenciales parecen estar en el formato correcto');
  } else {
    console.log('❓ Verifica el formato de tus credenciales en el dashboard de Cloudinary');
  }
}