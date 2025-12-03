# [0.5.0](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.4.1...v0.5.0) (2025-12-03)



## [0.4.1](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.4.0...v0.4.1) (2025-12-03)


### Features

* **configuracion): sesiones activas y aviso Próximamente\nchore(auth): mostrar última actualización de contraseña\nrefactor(configuracion): eliminar botones Guardar/Cancelar\nfeat(notificaciones): endpoint semanal de resumen\nfeat(apariencia:** modo oscuro y vista compacta ([f52da42](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/f52da42bd3f2128eed2d9e162f11d7e52bb944df))



# [0.4.0](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.3.1...v0.4.0) (2025-12-03)


### Features

* **documents:** modal con drag & drop y click-to-upload; subida de imágenes y PDF a Nextcloud por ID de lead; listado, vista previa, descarga y eliminación; estados DNI/Ingresos dinámicos; remove input manual ([619b702](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/619b702bfb78e81fc9a929e4b906178d6b0e2d01))



## [0.3.1](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.3.0...v0.3.1) (2025-12-03)



# [0.3.0](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.2.11...v0.3.0) (2025-12-03)


### Features

* **ui:** ampliar modales para mayor visibilidad de información ([fb94d71](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/fb94d71f563a106525231be825bdbfa6ba334b73))



## [0.2.11](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.2.10...v0.2.11) (2025-12-03)


### Bug Fixes

* **context:** evitar ReferenceError en InmobiliariaProvider ([fc1ff5a](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/fc1ff5a73cb4669b9a436aae4b210c432d169b66))
* **leads:** cargar leads y anuncios en modo global ([6c02ba8](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/6c02ba84b573c5fe19d4b71d4c09615fb54276a0))
* **version:** mostrar version desde package.json en Sidebar; lint: escapar comillas en textos ([3385d56](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/3385d56d95318fd17a37d941adf4e08f4af31ff9))
* **version:** sidebar lee version solo desde package.json; build: incluir CHANGELOG.md en imagen para mostrar Novedades ([a7ecdb1](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/a7ecdb15eab7f268213fcdd7da150ccd58cdae7d))


### Features

* **admin:** modo global 'Todas las inmobiliarias' y filtros condicionales en leads/anuncios ([8aadaf7](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/8aadaf76b7453a3609458cf7ab80dd8a4425b9af))
* **info:** fallback de planes desde PLAN_DATA cuando la tabla Planes no está disponible ([74bc752](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/74bc7529a645bb1340026349a515f436c4807c66))



## [0.2.10](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.2.9...v0.2.10) (2025-11-26)


### Features

* loaders de anuncios en Leads/Anuncios, banner plan inactivo, bloqueo mensajes y aval al superar límite, programación de downgrade al próximo periodo ([a00f46e](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/a00f46e7dc0d1f9b0e904412317b5d56b72518b5))



## [0.2.9](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.2.8...v0.2.9) (2025-11-26)


### Bug Fixes

* **css:** usar postcss.config.mjs para Tailwind v4; chore: eliminar postcss.config.js ([a32204b](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/a32204b9df64c3ae4ad43b3eb5c9a32f2a09e7dc))



## [0.2.8](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.2.7...v0.2.8) (2025-11-26)


### Bug Fixes

* **informacion:** fallback remoto al CHANGELOG y normalización de saltos de línea para mostrar novedades en producción ([ef78d08](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/ef78d08d0a1c6f0f1fd78b10a7e70f3f33bc70af))


### Features

* **info:** cambio de plan via API y alertas; fix: Tailwind v4 PostCSS config ([60438fc](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/60438fc29c8f6a8f6b4e5438436305d50be308ed))
* **novedades:** variantes de badge por categoría y sanitización de URLs en listado ([d9f6e98](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/d9f6e981ec5a3b6c7dcc348782514a17e4c95c4b))



## [0.2.7](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.2.6...v0.2.7) (2025-11-25)


### Bug Fixes

* **nextcloud:** fallback a /remote.php/webdav en descarga y borrado para compatibilidad ([be7dc24](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/be7dc24faea1094d69e5157be587311ea1be5a5c))
* **nextcloud:** soporta usuario en minúsculas, opción TLS inseguro y variables de entorno en app.yml\n\n- fallback a username lowercase en descarga/borrado\n- permite NEXTCLOUD_ALLOW_INSECURE=1 para entornos con TLS no válido\n- añade NEXTCLOUD_* al app.yml para despliegue\n- habilita lista/subida con TLS opcional ([fb8c66f](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/fb8c66fdace163b311257c11ab21f6b55a4766ea))
* **proxy:** evitar self-fetch; descarga directa desde Nextcloud si target es /api/nextcloud/file\n\n- inline disposition\n- TLS opcional\n- fallback rutas WebDAV ([96d3fc9](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/96d3fc9b7a39e525251864ed6cc2b9f41e2f2476))


### Features

* **informacion:** añadir tarjeta Novedades y separar subpuntos del changelog ([b56eb4a](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/b56eb4a70840f3e03faf99fe70536ad06dfd4c76))



## [0.2.6](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.2.5...v0.2.6) (2025-11-25)


### Bug Fixes

* estabiliza assets en dev y corrige subida de archivos en Crear anuncio\n\n- elimina desactivación de cache en dev (Next)\n- valida inmobiliaria antes de subir en creación\n- refresca y muestra archivos existentes en paso 3\n- ajustes menores de UI en Anuncios ([97c76b5](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/97c76b54978518761ca689338c6ef1378a452594))



## [0.2.5](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.2.4...v0.2.5) (2025-11-20)



## [0.2.4](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.2.3...v0.2.4) (2025-11-19)



## [0.2.3](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.2.2...v0.2.3) (2025-11-19)


### Features

* **leads): mostrar ID en tarjeta; fix(search): normalizar filtro a cadenas; chore(setup:** guardas de entorno y página de setup ([cf8d954](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/cf8d954e7e5db08ecc8b9ce1773cb23e536e370b))



## [0.2.2](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.2.1...v0.2.2) (2025-11-19)



## [0.2.1](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.2.0...v0.2.1) (2025-11-19)


### Features

* enable toggle for archived ads and add unarchive option to menu ([678aa33](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/678aa33935c3ed7f1f0e5dd945c43b83d9072a50))
* implement semantic versioning v0.2.0 with changelog and automated release scripts ([da7bc14](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/da7bc14e70e741d05365298f4c7c3c0ee17463ce))



# [0.2.0](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/936a50744be56b5ed43950a703ef8fb429138e87...v0.2.0) (2025-11-18)


### Bug Fixes

* remove vercel analytics for easypanel deployment ([936a507](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/936a50744be56b5ed43950a703ef8fb429138e87))



