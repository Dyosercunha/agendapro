import fs from "node:fs";

function replaceOrThrow(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Trecho não encontrado para patch: ${label}`);
  }
  return source.replace(search, replacement);
}

function patchAppointmentsApi() {
  const file = "src/lib/appointmentsApi.ts";
  let source = fs.readFileSync(file, "utf8");

  if (!source.includes("checkPublicSlotAvailability")) {
    source = replaceOrThrow(
      source,
      'export function getAdminAppointments(payload: Record<string, unknown>) {\n  return callRpcWithRestFallback("get_admin_appointments", payload);\n}\n',
      'export function getAdminAppointments(payload: Record<string, unknown>) {\n  return callRpcWithRestFallback("get_admin_appointments", payload);\n}\n\nexport function checkPublicSlotAvailability(payload: Record<string, unknown>) {\n  return callRpcWithRestFallback("check_public_slot_availability", payload);\n}\n',
      "appointmentsApi checkPublicSlotAvailability"
    );
  }

  fs.writeFileSync(file, source);
}

function patchAppTsx() {
  const file = "src/App.tsx";
  let source = fs.readFileSync(file, "utf8");

  if (!source.includes("checkPublicSlotAvailability")) {
    source = replaceOrThrow(
      source,
      '  cancelPublicAppointment,\n  getAdminAppointments,\n',
      '  cancelPublicAppointment,\n  checkPublicSlotAvailability,\n  getAdminAppointments,\n',
      "import checkPublicSlotAvailability"
    );
  }

  source = source.replace(
    'const publicScheduleLink = `${appOrigin}/${routeSlug || "barbearia"}`;',
    'const publicScheduleLink = `${appOrigin}/agendamento/${routeSlug || "barbearia"}`;'
  );

  source = source.replace(
    'if (scheduleIndex !== -1) window.history.replaceState(null, "", `/${nextSlug}`);',
    'if (scheduleIndex !== -1) window.history.replaceState(null, "", `/agendamento/${nextSlug}`);'
  );

  if (!source.includes("function ensureActiveOwnerAccess")) {
    source = replaceOrThrow(
      source,
      'function canAccessAdminTab(roleValue: string,tabId: string,isOwnerEmail=false){return canAccessAdminTabByRole(roleValue,tabId,isOwnerEmail);}\n',
      'function canAccessAdminTab(roleValue: string,tabId: string,isOwnerEmail=false){return canAccessAdminTabByRole(roleValue,tabId,isOwnerEmail);}\n\nfunction ensureActiveOwnerAccess(accounts: AccessAccount[], ownerEmail?: string): AccessAccount[] {\n  const cleanOwnerEmail = String(ownerEmail || "").trim().toLowerCase();\n  const normalized = accounts.map((account) => ({\n    ...account,\n    email: String(account.email || "").trim().toLowerCase(),\n  }));\n\n  if (!cleanOwnerEmail) return normalized;\n\n  const ownerIndex = normalized.findIndex((account) => account.email === cleanOwnerEmail);\n\n  if (ownerIndex >= 0) {\n    normalized[ownerIndex] = {\n      ...normalized[ownerIndex],\n      role: "Dono",\n      active: true,\n      fixed: true,\n    };\n    return normalized;\n  }\n\n  return [\n    {\n      id: null,\n      email: cleanOwnerEmail,\n      role: "Dono",\n      active: true,\n      fixed: true,\n      password: "",\n      passwordConfirm: "",\n    },\n    ...normalized,\n  ];\n}\n\nfunction hasActiveOwner(accounts: AccessAccount[]) {\n  return accounts.some(\n    (account) =>\n      account.active !== false &&\n      normalizeRole(account.role) === "dono" &&\n      String(account.email || "").includes("@")\n  );\n}\n',
      "owner access helpers"
    );
  }

  if (!source.includes("const normalizedAccessAccounts = ensureActiveOwnerAccess")) {
    source = replaceOrThrow(
      source,
      '      const activeAccounts = accessAccounts.filter((account) => account.active !== false);\n',
      '      const normalizedAccessAccounts = ensureActiveOwnerAccess(accessAccounts, business.ownerEmail);\n      const activeAccounts = normalizedAccessAccounts.filter((account) => account.active !== false);\n\n      if (!hasActiveOwner(activeAccounts)) {\n        return { error: { message: "A barbearia precisa manter pelo menos um Dono ativo." } };\n      }\n',
      "normalize access accounts before save"
    );
  }

  source = source.replace(
    "accesses_input: accessAccounts.map((account) => ({",
    "accesses_input: normalizedAccessAccounts.map((account) => ({"
  );

  if (!source.includes("const availabilityResult = await checkPublicSlotAvailability")) {
    source = source.replace(
      'const latestAppointments = (await refreshCloudAppointments()) || appointments;\n      const freshSlot = buildSlotsForDate(selectedDate, latestAppointments).find(\n        (slot) => slot.time === selectedTime\n      );\n\n      if (!freshSlot?.available) {\n        showNotice("Esse horário acabou de ficar indisponível. Escolha outro horário.");\n        setScreen("home");\n        setSelectedTime("");\n        setCloudStatus("Horário indisponível. Escolha outra opção.");\n        return;\n      }\n\n      const finalProfessional =\n        professional === firstAvailableProfessionalName ? freshSlot.professional : professional;',
      'const localSlot = buildSlotsForDate(selectedDate, appointments).find(\n        (slot) => slot.time === selectedTime\n      );\n\n      if (!localSlot?.available) {\n        showNotice("Esse horário já passou ou ficou indisponível. Escolha outro horário.");\n        setScreen("home");\n        setSelectedTime("");\n        setCloudStatus("Horário indisponível. Escolha outra opção.");\n        return;\n      }\n\n      const preliminaryProfessional =\n        professional === firstAvailableProfessionalName ? localSlot.professional : professional;\n\n      const availabilityResult = await checkPublicSlotAvailability({\n        target_slug: loadedCloudSlug(),\n        target_date: selectedDate,\n        target_time: selectedTime,\n        target_professional: preliminaryProfessional || professional,\n      });\n\n      if (availabilityResult.error) {\n        throw availabilityResult.error;\n      }\n\n      const availability = Array.isArray(availabilityResult.data)\n        ? availabilityResult.data[0]\n        : availabilityResult.data;\n\n      if (availability && availability.available === false) {\n        showNotice("Esse horário acabou de ser reservado. Escolha outro horário.");\n        setScreen("home");\n        setSelectedTime("");\n        setCloudStatus("Horário indisponível. Escolha outra opção.");\n        return;\n      }\n\n      const finalProfessional = preliminaryProfessional;'
    );
  }

  fs.writeFileSync(file, source);
}

patchAppointmentsApi();
patchAppTsx();
console.log("Ajustes urgentes do AgendaPro aplicados no build.");
