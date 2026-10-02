const { asyncHandler } = require('../../utils/http');
const taxonomy = require('../../services/taxonomyService');

const list = asyncHandler(async (req, res) => res.json(await taxonomy.listTaxonomy()));

const rename = asyncHandler(async (req, res) => {
  const { type, name } = req.valid.params;
  res.json(await taxonomy.renameTerm(type, name, req.valid.body.name));
});

const remove = asyncHandler(async (req, res) => {
  const { type, name } = req.valid.params;
  res.json(await taxonomy.deleteTerm(type, name));
});

module.exports = { list, rename, remove };
