/**
 * store.js — Mongoose-only data wrapper.
 * Exports `stores` with the same API previously provided by CollectionStore
 * (find, findOne, findById, create, findByIdAndUpdate, findByIdAndDelete)
 * so that all controllers work without modification.
 */

const { User, Field, AnalysisSession } = require('../models/index');

/**
 * Build a thin wrapper around a Mongoose model that mirrors the
 * CollectionStore interface used by the controllers.
 */
function makeStore(Model) {
  return {
    /**
     * find(query) — returns an array of matching documents.
     * Supports simple equality matching on top-level fields.
     */
    async find(query = {}) {
      return Model.find(query).lean();
    },

    /**
     * findOne(query) — returns the first matching document or null.
     */
    async findOne(query = {}) {
      return Model.findOne(query).lean();
    },

    /**
     * findById(id) — returns a single document by its _id or null.
     */
    async findById(id) {
      return Model.findById(id).lean();
    },

    /**
     * create(doc) — inserts a new document and returns it as a plain object.
     */
    async create(doc) {
      const created = await Model.create(doc);
      return created.toObject();
    },

    /**
     * findByIdAndUpdate(id, update, options) — updates a document by _id.
     * Always returns the updated document (new: true).
     */
    async findByIdAndUpdate(id, update, options = {}) {
      return Model.findByIdAndUpdate(id, update, { new: true, ...options }).lean();
    },

    /**
     * findByIdAndDelete(id) — deletes a document by _id and returns it.
     */
    async findByIdAndDelete(id) {
      return Model.findByIdAndDelete(id).lean();
    }
  };
}

const stores = {
  users: makeStore(User),
  fields: makeStore(Field),
  analysisSessions: makeStore(AnalysisSession)
};

module.exports = stores;
