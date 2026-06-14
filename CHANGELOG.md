## [0.9.27](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.9.22...v0.9.27) (2026-06-14)


### Bug Fixes

* add /api/formulario GET prefill fallback ([28e8448](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/28e8448ac5bf5cb8c56c1b30a55740530d34306c))
* adjuntos anuncios, RAG y colores aval ([b9e0601](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/b9e0601febc936fe4a560c48e30e65754d16b6d6))
* **agenda:** prevent completed/confirmed visits from becoming suggestions ([b1dfa07](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/b1dfa07019fb5172c3520cbd0233eee9656853b5))
* auth redirect + rbac leads + perfiles unicos ([4b8e5e1](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/4b8e5e18b9c5eb01c36accca35f4f03cb64f43e7))
* **auth:** auto-create profile and infer inmobiliaria on login ([0aa4c63](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/0aa4c637ea64325fffd50b83a7f1d0deed22ada2))
* **branding:** show company logo when available, fallback to Rentaflow ([371dfcb](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/371dfcba97391b5b9a29abd9cce36c79d869267a))
* **build:** postcss config typing ([e5e00d4](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/e5e00d45c1b1d703dd9876807e1e4296a9c1b822))
* **comunicaciones:** editor en página y orden ([c3755c2](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/c3755c2919cea5043a3323560062d6b4853ee8f9))
* **config:** prevent removing last local admin (and fix agenda duplicate key) ([cde4fe5](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/cde4fe5cec5d7f5846b90f9335b4d8492e0f858e))
* **demo:** blur pii en modal agenda ([bd80761](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/bd807613e8ce562fc4838d8cdaee924c1c821a06))
* **docker:** incluir scripts en imagen ([0853d91](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/0853d91d53032744376dfa062481e3b66f3fb3ae))
* fire Pedir Aval via DB trigger (avoid browser webhook fetch) ([b6f1ff0](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/b6f1ff060dfe4fabe01d146e50cdc87bc1521a85))
* incluir whatsapp sin idi/idc ([0fe9c30](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/0fe9c304d22b7ae1e60bb4ec73e99ae045092e8a))
* normalizar logo_url de supabase ([ddaa2d2](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/ddaa2d29bc2a78735254c974160aba136ce90864))
* permisos comunicaciones y payloads webhooks ([4205c1b](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/4205c1b3f48d5a35da245b519384bf5c6cb34ae8))
* **rbac:** decouple global superuser from local admin to enforce tenant isolation ([2811237](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/28112378bf8a7286e03671f7af5d982a9f20c60f))
* **rbac:** prevent non-super admins from selecting all inmobiliarias ([54fac5a](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/54fac5a8c259f2a3a830978b7d44d2874ed4883d))
* **rbac:** stop promoting administrador to is_admin; drop legacy sync triggers ([b13143f](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/b13143f63fa7cbc141716c57bb8e680e04064d73))
* render loop + ts errors ([9b69889](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/9b6988914409bfd191faff60e734ff6de0153356))
* sanitize supabase url env + improve scripts typing ([367e5d2](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/367e5d2f244c8a3e17bad57bb6351096d09a845a))
* **sidebar:** ignore broken logo_url ([75ba7ef](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/75ba7ef67e24ab0cbeac11221e1dbfc2d58ca4db))
* trigger n8n webhook on Pedir Aval ([c5989d4](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/c5989d4d6e559720e33dbad9fac6a32650723e86))
* **ui:** modo oscuro + stats anuncios antiguos ([c59f6b9](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/c59f6b9b09c7b2aa0b01be8296c5fea6e4d416a3))
* **webhook:** debug + sanitize peticion_aval url ([e296f17](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/e296f17a157424a8cbe80169331e2e8d39824055))
* **webhook:** evitar host incorrecto en peticion_aval + debug resolvedFrom ([0c03a46](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/0c03a468325022c5fe4a9035f2a27ce74972ccad))
* **webhook:** forzar url peticion_aval + mejor logging ([c8ec05b](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/c8ec05b4386414d3a83781bc84e9ee58b7c708bc))
* **webhook:** no usar auth global + exponer authSent en peticion_aval ([67c2878](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/67c2878b1d8bccf2548db594a31b818482fc12f8))
* **webhooks:** enrich peticion_aval payload + n8n UA ([8cf6e25](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/8cf6e2520ad60011747cf4cae7b98793b452efee))
* **webhook:** soportar auth header/basic para peticion_aval ([5acdb23](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/5acdb232c8d875528ed7155a2204d78505a1ed3c))


### Features

* **branding:** allow setting logo via URL ([e07c9b2](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/e07c9b29d42e8b8035295b91c4742e7165c7474d))
* **onboarding:** add supervised full signup (inmobiliaria + initial admin) ([c83e003](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/c83e00361bdcd5882df122c0d39cd52689076fbd))



## [0.9.22](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.9.21...v0.9.22) (2026-04-29)


### Bug Fixes

* **demo:** restringir modo demo y ocultar PII ([11149de](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/11149de2c19b8267e0f80a442d150b8bbff4f3f2))
* **ui:** login theme switch and agent functions toggle ([8917afa](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/8917afafd445fc52db52c4f9a95108710a1a1e67))



## [0.9.21](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.9.20...v0.9.21) (2026-04-21)


### Bug Fixes

* **agenda:** reliably map agent display name from Perfiles across schema variants + refresh list ([a84652e](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/a84652e972568451688548010e0beaa4609176c7))
* **agenda:** resolve agent display name by querying Perfiles with both email and local-part fallback ([fa98831](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/fa98831fb71fbfb280da2867a28fba00071caa56))
* **agenda:** show agent display name from Perfiles even when email lacks domain ([b3a8992](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/b3a89923d1bb5925248a29abf54a564ae2205553))
* **agenda:** stop infinite reload by stabilizing fetchAgentAndSchedule and avoiding agentsList dependency loop ([8019234](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/801923425bd5772441de804f849c596819959a84))
* **config:** allow admin/superuser to manage users (use isAdmin instead of label) ([1117d58](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/1117d5884b5fe6491a7642180855864c72b62003))
* **leads:** render email Html in iframe for accurate HTML preview ([1b9ea32](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/1b9ea325fe471cbbdbcfb9331baa0d5e36df6142))
* **leads:** show loading spinner instead of blank screen on /dashboard/leads ([2db9ee3](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/2db9ee342b8d6cdd7f61efbbd3d4178ccaa691cb))
* **timezone): store proposal visit time in Europe/Madrid and render proposal page in Madrid time\nfix(comms:** render email HTML in iframe (real preview) ([dcd65e2](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/dcd65e24ad6636af687ab11c8dd16c205add1a59))


### Features

* **config:** add 'Sincronizar agentes' to align Agentes.Nombre with Perfiles.nombre (match by email and local-part) ([340f5fd](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/340f5fdf4150638bd2dff62095717cc723a25d33))



## [0.9.20](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.9.11...v0.9.20) (2026-04-09)


### Bug Fixes

* **agenda): send real lead email (Correo) in confirm/reschedule/cancel visit webhooks\nfeat(config): allow superusers to create + edit inmobiliarias; admins can edit; adjust role detection\nfix(config:** correct JSX structure in Inmobiliaria section ([fba8510](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/fba8510393b1ed327ecbfe6c700f5aa19983f2a3))
* allow same-property visits and correct slot generation logic for admin and public pages ([eade4b6](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/eade4b6428c104c7e64c8fd2cb67506753d28d83))
* **auth:** resolve ERR_ABORTED race conditions in router push/refresh during authentication and session management ([f67aad1](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/f67aad194e5f7bfaa259132d22984abc1226c0d8))
* **booking:** allow agendar-visita link to show confirmed appointments ([aff7bd3](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/aff7bd3324c9f8e35f6283bbf674e5eb3873266f))
* comunicaciones crear y cancelar ([6c9902f](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/6c9902fb648590a7e3ecaf9eba4b201bce9a186f))
* corregir redireccion de root y persistencia de filtros en agenda ([24fb801](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/24fb801982c0b4274f8ec09293ffc01415e94d7d))
* **docker:** use standard node image instead of AWS ECR to resolve DNS timeout ([d959985](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/d959985c93ab8fb854ded5d8a853a8210e6b402b))
* **leads:** correct 'm_error' field name typo to properly display missing data info ([73a37ba](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/73a37ba297b857c3b70d5e6222cb28660fc06335))
* **leads:** hide overflow in communication cards and prevent prose from scrolling ([1f31d17](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/1f31d1714c4e2a94c0976c2324a4c736b02bf89b))
* **leads:** infer advertisement from selected leads for Visita Grupal ([9bb1d13](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/9bb1d1311e5029222b9ed9448a4799cdd987a30a))
* **leads:** resolve typescript possibly undefined error on Inmueble inference ([d258fdc](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/d258fdced5695e783f0e052adf4f91f4e92d5cb8))
* **leads:** stop auto-correcting 'Datos Incompletos' to 'Datos Completos' to allow manual override ([ed78e4d](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/ed78e4d392ab691ddaa9070e029f36f0f560e98f))
* **leads:** strictly hide 'm_error' field when empty, blank, or string 'null' ([874a1db](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/874a1dbd185ab9fdcfcab538a6176db28c68dc3f))
* resolve resendUserConfirmationAction error and improve logic ([e1f7ae8](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/e1f7ae8554d616b91747fd2fee472e3f0709e162))
* validar documento y estados de lead ([afe0d5f](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/afe0d5f0d738a290069d616506715a08948176b5))
* wrap formulario search params in suspense ([33552dd](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/33552dd5edd64314c32cef516bd085db417a1031))


### Features

* add plan usage alert to ads page and fix starter plan card layout ([524cb4c](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/524cb4c95f392590a2282f342e7f9b4703840742))
* **auth:** use logo image on login page instead of Lucide icon ([cbd656b](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/cbd656bcd9ccba8bd58c4f4bf6f674a4897d6979))
* enviar revisión comunicaciones ([7e49913](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/7e499137fbaff006a29cade882c5a65003650c43))
* **formulario:** add Situacion_Laboral and Motivo_Alquiler to submit payload ([6f7db03](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/6f7db032ec39b71867e6192949976f10a9ce8084))
* implementar logs de auditoría mejorados, política de retención y correcciones menores ([513a7a0](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/513a7a0777add4a09f65a5cb4297fff22edf908e))
* implementar mitigación ignore-scripts y añadir campos laborales al formulario ([7c0a1c5](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/7c0a1c5e7aef6abefe1211facb8a564c83cf5b9e))
* **layout:** use logo image as favicon globally ([3efa49c](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/3efa49c92d5964e6ad02818c2c23744856c7efa4))
* **leads:** add 'Situacion Laboral' next to 'Documento de Identidad' in personal info ([c756a96](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/c756a96b4f325afec2249418f63a69d8bfc3c625))
* **leads:** change border side and alignment for received communications ([1e92c9a](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/1e92c9a5d80485ebf159cc3fe528a85e02fdf539))
* **leads:** display 'm_errror' as 'Datos faltantes o erroneos' in lead personal info ([46fd59e](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/46fd59e1491c6156f05823de288e01f6af7d64e9))
* **leads:** hide 'm_error' field when empty or null ([0267f09](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/0267f09c65481b07afc3e7ae5a44fb18a3dcfcfe))
* políticas de seguridad (contraseñas robustas y logs de auditoría) ([591ec6b](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/591ec6b19038b346cc68da2652d80eaf5a1286f9))


### Performance Improvements

* **anuncios:** limit data fetching to last 90 days to improve load time ([2ae2869](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/2ae286953536eed1a14dd3250681bc64783242e1))



## [0.9.11](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.9.10...v0.9.11) (2026-02-13)


### Features

* **auth:** add forgot password link to login page ([6b1656f](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/6b1656f6b576226c4dac39c4d8ab1f80d3a8205b))



## [0.9.10](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.9.9...v0.9.10) (2026-02-10)


### Bug Fixes

* await params in visit proposal page for Next.js 15 compatibility ([abfd519](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/abfd5199454e3df8071433817da6cde92d2747ba))



## [0.9.9](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.9.8...v0.9.9) (2026-02-10)


### Bug Fixes

* allow public access to visit proposals via admin client to resolve 404 error ([6ac2eb7](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/6ac2eb7213bf60d2265bc4bc1d38eb755a571ca2))



## [0.9.8](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.9.7...v0.9.8) (2026-02-10)


### Bug Fixes

* resolve issue with group visit slots not appearing due to missing advertisement ID ([90685e4](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/90685e4f020ce952ffba9ecbb4be9074e0cb5cde))



## [0.9.7](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.9.3...v0.9.7) (2026-02-09)


### Bug Fixes

* cálculo periodo y métricas de WhatsApp en Información ([dd3874c](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/dd3874c34ef564e1257328930b7231ed873fb0b5))
* comunicaciones visitas y badges calendario ([ab5aef6](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/ab5aef605f1cfa5150ffe5950120771cc8e2aa35))
* mejora calendario movil ([67936bc](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/67936bc5fa9bf2f483fbe3f9212500ad4c177b31))
* mejoras anuncios y modales ([27c6796](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/27c6796e2a335cce4adc833c08b907be64f14d65))
* nextcloud list and supabase timeouts ([b9eba13](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/b9eba13a623ba444e57325393bad70ccb4a3a0a7))
* usar dominio app.rentaflow.es en enlaces ([8497b8a](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/8497b8a5c1a387a3e0be73a8189198bc7ce18647))


### Features

* agregar timeouts a webhooks y optimizaciones de rendimiento ([04827c0](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/04827c0ad7ff83e71c6c1fc8cf15885c29def576))
* **auth:** add show/hide password toggle to login page ([23f6ec9](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/23f6ec9ec3d177fe0565d8e721735cd0c1738243))



## [0.9.3](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.9.2...v0.9.3) (2026-01-26)


### Bug Fixes

* map Observaciones to Obsevaciones ([0d682de](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/0d682deb2bcad8357b908531ea3c1f647a85d8f0))
* separate propuesta and sugerir webhooks ([c34d27a](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/c34d27a9d8bc3b9c1a86b8e2f75a83b24852f472))
* update visita propuesta webhook ([f636f78](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/f636f78f88a37c7cef0f7c25fc683cebc8229948))


### Features

* agenda y visitas ([6c6ff78](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/6c6ff78f61349ef7c7722a1f8efa7224f5a9440b))



## [0.9.2](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.8.7...v0.9.2) (2026-01-24)


### Bug Fixes

* mejoras en anuncios y modales ([a0f6324](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/a0f6324f30915da5a8ce20344b5b79b1314fbe27))



## [0.8.7](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.8.6...v0.8.7) (2026-01-14)


### Bug Fixes

* build error add suspense to agendar-visita and fix quotes in leads page ([05cd31e](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/05cd31e2462a5bcad4fd830507d5494b55f24dea))



## [0.8.6](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.8.5...v0.8.6) (2026-01-14)



## [0.8.5](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.7.5...v0.8.5) (2026-01-14)


### Bug Fixes

* **agenda:** corregir errores de tipado y variable no definida en el selector ([9eaffc9](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/9eaffc9a8ff663f8204de147841e49c2c0d59aa4))
* **agenda:** v0.8.3 - Resolve application error on invalid dates and uncontrolled select ([862fdc3](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/862fdc37f965713b1ee37e22d09372dd121ce25f))
* **build:** agregar Suspense boundary para useSearchParams en auth/confirm y configuracion ([e253b8d](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/e253b8dfead29c3768b2fa69cfaeaa592d8994f2))
* resolve linter errors and update calendar component for v9 ([ed746ab](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/ed746ab6bf880b3e7ce38629faebda3d74f247ef))
* resolve linter errors in calendar and imports ([d068569](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/d06856989a7fa104a1280a9d5588d710da585cb8))
* resolve user management errors (RLS, column names, redirects) ([5cdfc98](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/5cdfc98ce1194c9c672c0fb5e240c0a03e155c21))
* **ui:** asegurar visualización de novedades y robustez en detección de permisos ([0ec2961](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/0ec2961d591167d49849a70af3e44982563b5303))


### Features

* add n8n webhook call on Visita Propuesta status change ([aab45f7](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/aab45f718473dde17f4f861925a25ed843f50f68))
* improve annotations visualization with user and timestamp separation ([4364503](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/436450369beca5e49f2b5983ba9b9973a61d08c4))
* upgrade to v0.8.4 (sidebar collapsed mode, rename to RentAFlow) ([3b960e3](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/3b960e303ecb6a7df96a316768343503dba967af))



## [0.7.5](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.7.4...v0.7.5) (2025-12-13)


### Bug Fixes

* **leads:** ver anotaciones guardadas (Observaciones); CTA 'Anotar'; ignorar aborts; mantener versión ([3f8c136](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/3f8c136cb8325a8e5cbf8849fc2a37516569e9cf))


### Features

* **leads, documents, comunicaciones:** mejoras de UI y búsqueda ([ae610c2](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/ae610c2fb8ad963ae00276d596ea6a7a50a1c253))
* **leads): eliminar anotaciones desde modal; mejorar zona de anotaciones (sombreado, ocultar bloque si vacío); fix(leads): Cancelar en modal con DialogClose; feat(leads): metadatos en anotaciones; fix(auth:** manejar AuthSessionMissingError ([c9017fb](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/c9017fb4f44d07c95df5961d4f4320030bf81217))
* **leads:** CTA 'Hacer clic aquí para anotar' en tarjetas y detalle ([754dcb3](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/754dcb3fb9c72a9c136e06dc3d75a3139e89c2eb))



## [0.7.4](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.7.3...v0.7.4) (2025-12-12)


### Bug Fixes

* **leads, anuncios:** navegación a Leads y Observaciones; logs ([c23e66b](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/c23e66b4161fbb99b46305469ee6cbeece79d0dd))



## [0.7.3](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.7.2...v0.7.3) (2025-12-11)


### Bug Fixes

* **leads:** ajustar email largo en modal Eliminar Lead (break-all) ([eba9bdb](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/eba9bdb30f975784e3498e4787d6196c17243e11))



## [0.7.2](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.7.1...v0.7.2) (2025-12-09)



## [0.7.1](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.7.0...v0.7.1) (2025-12-09)


### Bug Fixes

* **leads:** seleccionar anuncio al entrar con ?filter o ?ad ([4126af1](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/4126af1df3b5508b56e33525225accc36d9bf94a))



# [0.7.0](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.6.0...v0.7.0) (2025-12-09)


### Features

* **leads:** menú de estados y acciones especiales (Visita Propuesta, Aval Pedido) ([0391a71](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/0391a7185b707e94aff0c4c061ec0506d83b4096))



# [0.6.0](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.5.2...v0.6.0) (2025-12-08)



## [0.5.2](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.5.1...v0.5.2) (2025-12-08)


### Bug Fixes

* **dark-mode:** aplicar tema oscuro en modal Leads, dropzones y comunicaciones ([8896213](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/88962130c7afff3a5aef36e862ca9f145b8b6ca4))
* mejorar visibilidad badge incompleto - fondo naranja claro, texto ambar oscuro, colores consistentes ([69944af](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/69944affa96e12f6dee141c3504d7a247d0b60f6))


### Features

* Destacar pestañas de Avalista en verde para Personas 2, 3 y 4. Muestra '🛡️ AVALISTA:' cuando el tipo es Avalista y aplica colores verdes destacados. Mantiene funcionalidad existente para no Avalistas. ([a2a33ac](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/a2a33acac59e4533057930ce72538fe0ea9ab38d))
* **leads:** clic en 'Datos Completos' para programar visita y cambiar a 'Visita Propuesta'; patrón Personas 2/3/4 replicado ([a5b8bba](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/a5b8bbae698cd6c71e6dae143c21dd2309e3f248))



## [0.5.1](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/compare/v0.5.0...v0.5.1) (2025-12-03)


### Bug Fixes

* **ui:** mejorar legibilidad en modo oscuro en Leads y Anuncios ([738fd47](https://github.com/jiglesiasdile4g-dot/Rentaflow_Trae/commit/738fd47ce6eae61cfbdd06dc8d515e98b014db7b))



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



