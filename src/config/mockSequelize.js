/**
 * Mock Sequelize for Vercel Serverless
 * 
 * Provides a basic in-memory implementation when native databases aren't available
 * This allows the API to work on Vercel without requiring native package compilation
 */

const mockData = {};

// Mock DataTypes - make them functions that can be called with parameters
export const DataTypes = {
  INTEGER: function() { return 'INTEGER'; },
  STRING: function(length) { return `STRING(${length || 255})`; },
  TEXT: function() { return 'TEXT'; },
  BOOLEAN: function() { return 'BOOLEAN'; },
  DATE: function() { return 'DATE'; },
  JSON: function() { return 'JSON'; },
  JSONB: function() { return 'JSONB'; },
  UUID: 'UUID',
  UUIDV4: 'UUIDV4',
  ENUM: (...values) => ({ type: 'ENUM', values }),
  VIRTUAL: 'VIRTUAL',
  NOW: () => new Date(),
};

export class MockSequelize {
  constructor(config) {
    this.config = config;
    this.models = {};
    this.DataTypes = DataTypes;
    // For compatibility with code expecting sequelize.Sequelize.DataTypes
    this.Sequelize = {
      DataTypes,
      Model: class {}, // Placeholder
      Op: {}, // Placeholder for operators
    };
    console.log('📦 Using MockSequelize (in-memory database)');
  }

  async authenticate() {
    console.log('✅ Mock database authenticated');
    return true;
  }

  async sync(options = {}) {
    console.log('✅ Mock database synced');
    return true;
  }

  async close() {
    console.log('✅ Mock database closed');
    return true;
  }

  define(name, attributes, options = {}) {
    console.log(`📋 Defining mock model: ${name}`);
    
    class Model {
      constructor(data = {}) {
        this.id = data.id || Math.random().toString(36);
        Object.assign(this, data);
      }

      static async findByPk(id) {
        const store = mockData[name] || [];
        return store.find(m => m.id === id) || null;
      }

      static async findAll() {
        return mockData[name] || [];
      }

      static async findOne() {
        return (mockData[name] || [])[0] || null;
      }

      static async create(data) {
        if (!mockData[name]) mockData[name] = [];
        const instance = new this(data);
        mockData[name].push(instance);
        return instance;
      }

      static async count() {
        return (mockData[name] || []).length;
      }

      async save() {
        return this;
      }

      async update(data) {
        Object.assign(this, data);
        return this;
      }

      async destroy() {
        const store = mockData[name] || [];
        const index = store.indexOf(this);
        if (index > -1) store.splice(index, 1);
        return true;
      }
    }

    // Don't try to set readonly name property
    Object.defineProperty(Model, 'attributes', { value: attributes });
    this.models[name] = Model;
    return Model;
  }
}

export default MockSequelize;
