const wrapAsync = (routeHandler) => {
  return function(req, res, next) {
    return routeHandler(req, res, next)
      .catch(error => next(error))
  }
}

module.exports = {wrapAsync}
