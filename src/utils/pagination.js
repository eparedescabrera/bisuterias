export function parsePagination(query = {}) {
  const pagina = Math.max(
    1,
    Number.parseInt(query.pagina ?? query.page, 10) || 1
  );
  let limite = Number.parseInt(query.limite ?? query.limit, 10) || 12;
  if (limite < 1) limite = 12;
  if (limite > 100) limite = 100;
  const offset = (pagina - 1) * limite;

  return { pagina, limite, offset };
}

export function buildMeta(total, pagina, limite) {
  const totalPaginas = Math.max(1, Math.ceil(total / limite) || 1);
  return {
    pagina,
    limite,
    total,
    totalPaginas
  };
}
