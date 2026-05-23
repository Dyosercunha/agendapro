// @ts-nocheck
import React from "react";

export default function ServicesPanel({ model }) {
  const {
    activeAdminTab,
    addService,
    cloudSaving,
    isServiceDeleted,
    removeService,
    saveServicesToCloud,
    services,
    updateService,
  } = model;

  return (
    <>
        <section className={activeAdminTab === "services" ? "card" : "hiddenPanel"}>
          <h2>Serviços</h2>
          {services
            .map((service, index) => ({ ...service, originalIndex: index }))
            .filter((service) => !isServiceDeleted(service))
            .map((service) => (
            <div className="adminItem" key={service.id || service.originalIndex}>
              <label>Nome</label>
              <input value={service.name} onChange={(event) => updateService(service.originalIndex, "name", event.target.value)} />

              <div className="timePair">
                <div>
                  <label>Tempo</label>
                  <input type="number" value={service.duration} onChange={(event) => updateService(service.originalIndex, "duration", event.target.value)} />
                </div>
                <div>
                  <label>Preço</label>
                  <input type="number" value={service.price} onChange={(event) => updateService(service.originalIndex, "price", event.target.value)} />
                </div>
              </div>

              <button type="button" className={service.active ? "selected" : ""} onClick={() => updateService(service.originalIndex, "active", !service.active)}>
                {service.active ? "Serviço ativo" : "Serviço inativo"}
              </button>
              <button type="button" className="dangerButton" onClick={() => removeService(service.originalIndex)}>
                Excluir serviço
              </button>
            </div>
          ))}

          <button type="button" className="black" onClick={addService}>
            Adicionar serviço
          </button>

          <button type="button" className="green" onClick={saveServicesToCloud}>
            {cloudSaving === "services" ? "Salvando serviços..." : "Salvar serviços"}
          </button>
        </section>


    </>
  );
}
