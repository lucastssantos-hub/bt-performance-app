alter table public.bt_biblioteca_exercicios
  drop constraint if exists bt_biblioteca_exercicios_ambiente_check;

alter table public.bt_biblioteca_exercicios
  add constraint bt_biblioteca_exercicios_ambiente_check
  check (ambiente in ('academia', 'areia', 'funcional', 'cardio'));
