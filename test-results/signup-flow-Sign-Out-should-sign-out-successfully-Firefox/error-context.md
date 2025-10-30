# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - link "K" [ref=e6] [cursor=pointer]:
          - /url: /
        - generic [ref=e7]:
          - heading "Bienvenido de nuevo a Kolink" [level=1] [ref=e8]
          - paragraph [ref=e9]: Inicia sesión para seguir creando contenido que conecta en LinkedIn.
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]:
            - text: Correo electrónico
            - textbox "Correo electrónico" [ref=e13]:
              - /placeholder: nombre@empresa.com
          - generic [ref=e14]:
            - text: Contraseña
            - textbox "Contraseña" [ref=e15]:
              - /placeholder: Ingresa tu contraseña
          - button "Iniciar sesión" [ref=e16] [cursor=pointer]
        - paragraph [ref=e17]:
          - text: ¿Necesitas ayuda? Escríbenos a
          - link "info@kolink.es" [ref=e18] [cursor=pointer]:
            - /url: mailto:info@kolink.es
        - paragraph [ref=e19]:
          - text: ¿Aún no tienes cuenta?
          - link "Regístrate" [ref=e20] [cursor=pointer]:
            - /url: /signup
  - button "Open Next.js Dev Tools" [ref=e26] [cursor=pointer]:
    - img [ref=e27]
  - alert [ref=e31]: Inicia sesión | KOLINK
```