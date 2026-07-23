export function success(res, data = null, message = 'Operación realizada correctamente', status = 200, meta = null) {
  return res.status(status).json({
    success: true,
    message,
    data,
    meta
  });
}

export function fail(res, message, status = 400, errors = []) {
  return res.status(status).json({
    success: false,
    message,
    errors
  });
}
