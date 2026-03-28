# Seguridad y Logs de Auditoría

## Logs de Auditoría

Esta aplicación registra las acciones críticas en la tabla `Audit_Logs` dentro de Supabase.

### Acciones Registradas
- **Autenticación (AUTHENTICATION)**: Inicios de sesión, cierres de sesión y cambios de contraseña.
- **Acceso Sensible (SENSITIVE_ACCESS)**: Acceso a documentos o datos sensibles.
- **Operacional (OPERATIONAL)**: Creación, actualización o eliminación de expedientes (`Clientes`) y anuncios (`Anuncios`).
- **Administración (ADMINISTRATION)**: Altas y bajas de usuarios (`Agentes`), cambios de roles, y modificaciones en la configuración de la inmobiliaria.

### Política de Retención de Logs

**Todos los logs de auditoría se retienen por un período estricto de 12 meses.**
Después de 12 meses, los registros antiguos deben ser archivados en almacenamiento en frío o eliminados permanentemente, según los requisitos de cumplimiento de la organización.
Esta política se implementa para mantener un rendimiento óptimo de la base de datos y cumplir con los estándares de seguridad y privacidad.

Para garantizar que los logs con más de 12 meses de antigüedad se eliminen automáticamente, se debe configurar una tarea programada (cron job o pg_cron) en la base de datos:

```sql
-- Ejemplo de consulta de limpieza para ejecutar mensualmente
DELETE FROM public."Audit_Logs"
WHERE created_at < NOW() - INTERVAL '12 months';
```
