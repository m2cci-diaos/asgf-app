// backend/middlewares/validation.js
// Middleware de validation simplifié (sans Joi)

export function validateBody(validatorFn) {
  return (req, res, next) => {
    const result = validatorFn(req.body)
    
    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: result.errors,
      })
    }

    if (result.data) {
      req.body = result.data
    }
    
    next()
  }
}

export function validateQuery(validatorFn) {
  return (req, res, next) => {
    const result = validatorFn(req.query)
    
    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation des paramètres',
        errors: result.errors,
      })
    }

    if (result.data) {
      req.query = result.data
    }
    
    next()
  }
}

export function validateParams(validatorFn) {
  return (req, res, next) => {
    const result = validatorFn(req.params.id)
    
    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation des paramètres',
        errors: result.errors,
      })
    }
    
    next()
  }
}
