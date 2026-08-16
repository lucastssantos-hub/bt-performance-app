# Catálogo de exercícios e mídias

O catálogo canônico fica em `bt_biblioteca_exercicios`. Os GIFs e vídeos ficam no bucket privado `bt-exercicios`, e `bt_exercicio_midias` relaciona cada arquivo ao exercício.

## Modelo adotado

- movimento, capacidade, região e equipamento são metadados do exercício;
- feminino/masculino é apenas uma variante do demonstrador;
- execução correta, educativo e erro comum são finalidades diferentes;
- caminhos incluem versão e checksum, evitando cache de arquivo antigo;
- o app autenticado pode ler; somente um processo administrativo pode importar ou alterar.

## Importar a pasta do Google Drive

1. No Drive, faça download da pasta completa e descompacte-a localmente.
2. Gere uma prévia, sem enviar nada:

```sh
cd app
node scripts/importar-exercicios-drive.mjs "/caminho/da/pasta"
```

3. Revise `tmp/catalogo-exercicios-drive.json`. Corrija nomes ambíguos na origem e gere novamente. O importador bloqueia o envio se não reconhecer o equipamento.
4. Em um terminal administrativo, defina `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` e execute:

```sh
node scripts/importar-exercicios-drive.mjs "/caminho/da/pasta" --apply
```

Nunca coloque a service role no código do app, no navegador ou no repositório. O importador é idempotente pelo ID do exercício e pelo caminho versionado da mídia.

## Convenção recomendada para novos arquivos

Mantenha a hierarquia `DEMONSTRADOR / CONTEXTO / EQUIPAMENTO / REGIÃO / arquivo` e nomes de exercício estáveis. Use `WRONG`/`ERRADO` apenas para erro comum e `RIGHT`/`CORRETO` apenas para material educativo. Uma nova execução do mesmo arquivo produz o mesmo caminho; um arquivo alterado recebe outro checksum.
