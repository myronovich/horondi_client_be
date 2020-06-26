const Material = require('./material.model');

class MaterialsService {
  getAllMaterials() {
    return Material.find();
  }

  getMaterialById(id) {
    return Material.findById(id);
  }

  updateMaterial(id, material) {
    return Material.findByIdAndUpdate(id, material);
  }

  addMaterial(data) {
    const material = new Material(data);
    return material.save();
  }

  deleteMaterial(id) {
    return Material.findByIdAndDelete(id);
  }
}

module.exports = new MaterialsService();
