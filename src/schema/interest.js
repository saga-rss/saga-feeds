const interestSearch = async (source, args, context) => {
  const allInterests = await context.models.interest.getAllInterests()

  return allInterests
}

const interestCreate = async (source, { parent = null, name }, context) => {
  const created = await context.models.interest.createInterest(name, parent)

  return {
    id: created._id,
    name: created.name,
    slug: created.slug,
  }
}

const interestUpdate = async (source, { id, parent, name }, context) => {
  const updated = await context.models.interest.findOneAndUpdate({ _id: id }, { name, parent }, { new: true })

  return {
    id: updated._id,
    name: updated.name,
    slug: updated.slug,
  }
}

module.exports = {
  interestCreate,
  interestSearch,
  interestUpdate,
}
