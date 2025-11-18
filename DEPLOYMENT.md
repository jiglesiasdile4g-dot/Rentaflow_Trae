# Despliegue en Easypanel

## Prerrequisitos
- Una cuenta en [Easypanel](https://easypanel.io)
- Un VPS con Docker instalado
- Tu instancia de Supabase configurada

## Variables de Entorno Requeridas

Crea un archivo `.env` en la raíz del proyecto con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima-aqui
```

## Despliegue con Easypanel

### Opción 1: Desde GitHub (Recomendado)

1. **Sube tu código a GitHub**
2. **En Easypanel**:
   - Crea un nuevo proyecto
   - Ve a "Apps" → "Create App"
   - Selecciona "From GitHub Repository"
   - Conecta tu cuenta de GitHub
   - Selecciona tu repositorio
   - Easypanel detectará automáticamente el `Dockerfile`

### Opción 2: Desde Dockerfile local

1. **Prepara tu VPS**:
   ```bash
   # Instala Easypanel
   curl -sSL https://easypanel.io/install.sh | sh
   ```

2. **Sube tu proyecto al VPS** (usando SCP, Git, etc.)

3. **En Easypanel**:
   - Crea un nuevo proyecto
   - Ve a "Apps" → "Create App"
   - Selecciona "From Dockerfile"
   - Configura las variables de entorno

## Variables de Entorno en Easypanel

En el panel de Easypanel, asegúrate de configurar:

- `NEXT_PUBLIC_SUPABASE_URL`: Tu URL de Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Tu API Key anónima
- `NODE_ENV`: production

## Comandos Útiles

### Construir localmente para测试:
```bash
docker build -t rentaflow-dashboard .
docker run -p 3000:3000 -e NEXT_PUBLIC_SUPABASE_URL=tu_url -e NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key rentaflow-dashboard
```

### Usar Docker Compose local:
```bash
docker-compose up --build
```

## Monitoreo

Easypanel proporciona:
- Logs en tiempo real
- Monitoreo de recursos
- Health checks automáticos
- Renewal automático de SSL

## Troubleshooting

### Si la app no inicia:
1. Verifica las variables de entorno
2. Revisa los logs en Easypanel
3. Asegúrate de que Supabase esté accesible

### Si hay problemas de build:
1. Verifica que todas las dependencias estén en package.json
2. Ejecuta `npm run build` localmente para测试