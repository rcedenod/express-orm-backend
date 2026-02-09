const API_URL = '/to-process';
const state = { users: [], profiles: [], objects: [], methods: [], permissionMethods: [] };
const PROTECTED_DEFAULT_OBJECTS = new Set(['UserBO', 'PersonBO', 'ProfileBO', 'MethodBO', 'ObjectBO']);
const feedback = {
  modal: null,
  title: null,
  message: null,
  confirmBtn: null,
  cancelBtn: null,
  resolve: null
};

const navActiveClasses = ['bg-red-50', 'text-red-700', 'border-primary'];
const navInactiveClasses = ['text-slate-600'];

async function ensureSession() {
  try {
    const response = await fetch('/check-session');
    const data = await response.json();
    if (!data.authenticated) {
      window.location.href = '/login-view';
      return false;
    }
    return true;
  } catch (_) {
    window.location.href = '/login-view';
    return false;
  }
}

async function callBackend(objectName, methodName, params = {}) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectName, methodName, params })
    });

    if (response.status === 401) {
      window.location.href = '/login-view';
      return { sts: false, msg: 'Sesion expirada' };
    }

    const data = await response.json();
    if (data && data.sts === false && typeof data.msg === 'string' && data.msg.toLowerCase().includes('login')) {
      window.location.href = '/login-view';
    }
    return data;
  } catch (error) {
    console.error(error);
    return { sts: false, msg: 'No se pudo conectar con el servidor' };
  }
}

function initFeedbackModal() {
  feedback.modal = document.getElementById('feedbackModal');
  feedback.title = document.getElementById('feedbackTitle');
  feedback.message = document.getElementById('feedbackMessage');
  feedback.confirmBtn = document.getElementById('feedbackConfirmBtn');
  feedback.cancelBtn = document.getElementById('feedbackCancelBtn');

  if (!feedback.modal || !feedback.confirmBtn || !feedback.cancelBtn) return;

  feedback.confirmBtn.addEventListener('click', () => closeFeedbackModal(true));
  feedback.cancelBtn.addEventListener('click', () => closeFeedbackModal(false));
  feedback.modal.addEventListener('click', (event) => {
    if (event.target === feedback.modal) closeFeedbackModal(false);
  });
}

function closeFeedbackModal(result) {
  if (!feedback.modal) return;
  feedback.modal.classList.add('hidden');
  const resolver = feedback.resolve;
  feedback.resolve = null;
  if (resolver) resolver(result);
}

function openFeedbackModal({
  title = 'Mensaje',
  message = '',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  showCancel = false
}) {
  if (!feedback.modal) return Promise.resolve(true);

  feedback.title.textContent = title;
  feedback.message.textContent = message;
  feedback.confirmBtn.textContent = confirmText;
  feedback.cancelBtn.textContent = cancelText;
  feedback.cancelBtn.classList.toggle('hidden', !showCancel);
  feedback.modal.classList.remove('hidden');

  return new Promise((resolve) => {
    feedback.resolve = resolve;
  });
}

function toast(msg) {
  return openFeedbackModal({
    title: 'Informacion',
    message: msg,
    confirmText: 'Entendido'
  });
}

function askConfirm(msg) {
  return openFeedbackModal({
    title: 'Confirmacion',
    message: msg,
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    showCancel: true
  });
}

function styleActionButtons() {
  document.querySelectorAll('.btn-base.btn-action').forEach((btn) => {
    btn.classList.add('text-xs', 'px-2.5', 'py-1.5', 'bg-slate-50', 'hover:bg-slate-100');
  });
  document.querySelectorAll('.btn-danger.btn-action').forEach((btn) => {
    btn.classList.add('text-xs', 'px-2.5', 'py-1.5', 'bg-red-50', 'hover:bg-red-100');
  });
}

function wireLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    const shouldLogout = await askConfirm('Deseas cerrar sesion ahora?');
    if (!shouldLogout) return;

    try {
      await fetch('/logout', { method: 'POST' });
    } catch (error) {
      console.error(error);
    } finally {
      window.location.href = '/login-view';
    }
  });
}

function esc(value) { return String(value ?? '').replace(/'/g, "\\'"); }
function normalizeText(value) { return String(value ?? '').trim().toLowerCase(); }

function filterMethodsByInputs(methods, methodInputId, objectInputId) {
  const methodFilter = normalizeText(document.getElementById(methodInputId)?.value);
  const objectFilter = normalizeText(document.getElementById(objectInputId)?.value);

  return methods.filter((m) => {
    const methodName = normalizeText(m.method);
    const objectName = normalizeText(m.object);
    const methodOk = !methodFilter || methodName.includes(methodFilter);
    const objectOk = !objectFilter || objectName === objectFilter;
    return methodOk && objectOk;
  });
}

function populateObjectFilterSelect(selectId, methods) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const previousValue = select.value;
  const objectNames = [...new Set(methods.map((m) => String(m.object || '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

  select.innerHTML = '<option value="">Todos los objetos</option>';
  objectNames.forEach((objectName) => {
    const option = document.createElement('option');
    option.value = objectName;
    option.textContent = objectName;
    select.appendChild(option);
  });

  if ([...select.options].some((opt) => opt.value === previousValue)) {
    select.value = previousValue;
  }
}

function clearMethodsFilters() {
  const methodInput = document.getElementById('methodsFilterMethodName');
  const objectInput = document.getElementById('methodsFilterObjectName');
  if (methodInput) methodInput.value = '';
  if (objectInput) objectInput.value = '';
  renderMethodsTable();
}

function clearPermissionsFilters() {
  const methodInput = document.getElementById('permissionsFilterMethodName');
  const objectInput = document.getElementById('permissionsFilterObjectName');
  if (methodInput) methodInput.value = '';
  if (objectInput) objectInput.value = '';
  renderPermissionsGrid();
}

function setNavLinkState(link, active) {
  if (active) {
    navActiveClasses.forEach((cls) => link.classList.add(cls));
    navInactiveClasses.forEach((cls) => link.classList.remove(cls));
  } else {
    navActiveClasses.forEach((cls) => link.classList.remove(cls));
    navInactiveClasses.forEach((cls) => link.classList.add(cls));
  }
}

function setActiveSection(section) {
  document.querySelectorAll('section[id^="sec-"]').forEach((sec) => sec.classList.add('hidden'));
  document.getElementById(`sec-${section}`).classList.remove('hidden');

  document.querySelectorAll('#sidebarNav .nav-link[data-section]').forEach((link) => {
    setNavLinkState(link, link.dataset.section === section);
  });

  const map = {
    usuarios: ['Usuarios', 'Administra cuentas, perfiles y acceso'],
    perfiles: ['Perfiles', 'Crea y edita perfiles del sistema'],
    objetos: ['Objetos', 'Gestiona los objetos del esquema security'],
    metodos: ['Metodos', 'Gestiona metodos asociados a objetos'],
    permisos: ['Permisos', 'Asigna permisos de metodos por perfil']
  };

  document.getElementById('mainTitle').textContent = map[section][0];
  document.getElementById('mainSubtitle').textContent = map[section][1];
}

function wireNavigation() {
  document.querySelectorAll('#sidebarNav .nav-link[data-section]').forEach((link) => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      const section = link.dataset.section;
      setActiveSection(section);
      await loadSectionData(section);
    });
  });
}

async function loadSectionData(section) {
  if (section === 'usuarios') await loadUsers();
  if (section === 'perfiles') await loadProfiles();
  if (section === 'objetos') await loadObjects();
  if (section === 'metodos') await loadMethodsAndObjects();
  if (section === 'permisos') await loadPermissionsSetup();
}

function fillProfilesSelects() {
  const profileSelect = document.getElementById('profileSelect');
  const userProfiles = document.getElementById('user_profiles');

  profileSelect.innerHTML = '<option value="">Selecciona un perfil</option>';
  userProfiles.innerHTML = '';

  state.profiles.forEach((p) => {
    const optA = document.createElement('option');
    optA.value = p.id_profile;
    optA.textContent = p.profile;
    profileSelect.appendChild(optA);

    const optB = document.createElement('option');
    optB.value = p.id_profile;
    optB.textContent = `${p.id_profile} - ${p.profile}`;
    userProfiles.appendChild(optB);
  });
}

async function loadProfiles() {
  const res = await callBackend('ProfileBO', 'getProfiles');
  if (!res.sts) return toast(res.msg || 'No se pudieron cargar perfiles');

  state.profiles = res.data;
  fillProfilesSelects();

  const tbody = document.querySelector('#profilesTable tbody');
  tbody.innerHTML = '';
  state.profiles.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="px-4 py-3">${p.id_profile}</td><td class="px-4 py-3">${p.profile}</td><td class="px-4 py-3"><button class="btn-base btn-action" onclick="editProfile(${p.id_profile}, '${esc(p.profile)}')">Editar</button><button class="btn-danger btn-action" onclick="deleteProfile(${p.id_profile})">Eliminar</button></td>`;
    tbody.appendChild(tr);
  });
  styleActionButtons();
}

function resetProfileForm() {
  document.getElementById('profile_id').value = '';
  document.getElementById('profile_name').value = '';
  document.getElementById('profileSubmitBtn').textContent = 'Crear perfil';
}

function editProfile(id, name) {
  document.getElementById('profile_id').value = id;
  document.getElementById('profile_name').value = name;
  document.getElementById('profileSubmitBtn').textContent = 'Actualizar perfil';
}

async function saveProfile(event) {
  event.preventDefault();
  const id = document.getElementById('profile_id').value;
  const profileName = document.getElementById('profile_name').value.trim();

  const res = id
    ? await callBackend('ProfileBO', 'updateProfile', { id_profile: Number(id), profileName })
    : await callBackend('ProfileBO', 'createProfile', { profileName });

  if (!res.sts) return toast(res.msg || 'No se pudo guardar perfil');
  resetProfileForm();
  await loadProfiles();
  toast(res.msg || 'Perfil guardado');
}

async function deleteProfile(id) {
  if (!(await askConfirm('Deseas eliminar este perfil?'))) return;
  const res = await callBackend('ProfileBO', 'deleteProfiles', { ids: [Number(id)] });
  if (!res.sts) return toast(res.msg || 'No se pudo eliminar perfil');
  await loadProfiles();
}

function fillObjectsSelect() {
  const select = document.getElementById('method_object_id');
  select.innerHTML = '<option value="">Selecciona un objeto</option>';
  state.objects.forEach((obj) => {
    const option = document.createElement('option');
    option.value = obj.id_object;
    option.textContent = `${obj.id_object} - ${obj.object}`;
    select.appendChild(option);
  });
}

async function loadObjects() {
  const res = await callBackend('ObjectBO', 'getObjects');
  if (!res.sts) return toast(res.msg || 'No se pudieron cargar objetos');

  state.objects = res.data;
  fillObjectsSelect();

  const tbody = document.querySelector('#objectsTable tbody');
  tbody.innerHTML = '';
  state.objects.forEach((obj) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="px-4 py-3">${obj.id_object}</td><td class="px-4 py-3">${obj.object}</td><td class="px-4 py-3"><button class="btn-base btn-action" onclick="editObject(${obj.id_object}, '${esc(obj.object)}')">Editar</button><button class="btn-danger btn-action" onclick="deleteObject(${obj.id_object})">Eliminar</button></td>`;
    tbody.appendChild(tr);
  });
  styleActionButtons();
}

function resetObjectForm() {
  document.getElementById('object_id').value = '';
  document.getElementById('object_name').value = '';
  document.getElementById('objectSubmitBtn').textContent = 'Crear objeto';
}

function editObject(id, name) {
  document.getElementById('object_id').value = id;
  document.getElementById('object_name').value = name;
  document.getElementById('objectSubmitBtn').textContent = 'Actualizar objeto';
}

async function saveObject(event) {
  event.preventDefault();
  const id = document.getElementById('object_id').value;
  const object = document.getElementById('object_name').value.trim();

  const res = id
    ? await callBackend('ObjectBO', 'updateObject', { id_object: Number(id), object })
    : await callBackend('ObjectBO', 'createObject', { object });

  if (!res.sts) return toast(res.msg || 'No se pudo guardar objeto');
  resetObjectForm();
  await loadObjects();
  await loadMethods();
  toast(res.msg || 'Objeto guardado');
}

async function deleteObject(id) {
  if (!(await askConfirm('Deseas eliminar este objeto?'))) return;
  const res = await callBackend('ObjectBO', 'deleteObjects', { ids: [Number(id)] });
  if (!res.sts) return toast(res.msg || 'No se pudo eliminar objeto');
  await loadObjects();
  await loadMethods();
}

async function loadMethods() {
  const res = await callBackend('MethodBO', 'getMethods');
  if (!res.sts) return toast(res.msg || 'No se pudieron cargar metodos');

  state.methods = res.data;
  renderMethodsTable();
}

function renderMethodsTable() {
  const methodsFiltersContainer = document.getElementById('methodsFiltersContainer');
  const hasMethods = state.methods.length > 0;
  methodsFiltersContainer.classList.toggle('hidden', !hasMethods);

  populateObjectFilterSelect('methodsFilterObjectName', state.methods);

  const tbody = document.querySelector('#methodsTable tbody');
  tbody.innerHTML = '';

  const filteredMethods = filterMethodsByInputs(
    state.methods,
    'methodsFilterMethodName',
    'methodsFilterObjectName'
  );

  filteredMethods.forEach((m) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="px-4 py-3">${m.id_method}</td><td class="px-4 py-3">${m.method}</td><td class="px-4 py-3">${m.object}</td><td class="px-4 py-3"><button class="btn-base btn-action" onclick="editMethod(${m.id_method}, '${esc(m.method)}', ${m.fk_id_object})">Editar</button><button class="btn-danger btn-action" onclick="deleteMethod(${m.id_method})">Eliminar</button></td>`;
    tbody.appendChild(tr);
  });
  styleActionButtons();
}

async function loadMethodsAndObjects() {
  await loadObjects();
  await loadMethods();
}

function resetMethodForm() {
  document.getElementById('method_id').value = '';
  document.getElementById('method_name').value = '';
  document.getElementById('method_object_id').value = '';
  document.getElementById('methodSubmitBtn').textContent = 'Crear metodo';
}

function editMethod(id, method, fk_id_object) {
  document.getElementById('method_id').value = id;
  document.getElementById('method_name').value = method;
  document.getElementById('method_object_id').value = fk_id_object;
  document.getElementById('methodSubmitBtn').textContent = 'Actualizar metodo';
}

async function saveMethod(event) {
  event.preventDefault();
  const id = document.getElementById('method_id').value;
  const methodName = document.getElementById('method_name').value.trim();
  const objectId = Number(document.getElementById('method_object_id').value);

  const res = id
    ? await callBackend('MethodBO', 'updateMethod', { id_method: Number(id), method: methodName, fk_id_object: objectId })
    : await callBackend('MethodBO', 'createMethod', { name: methodName, id_object: objectId });

  if (!res.sts) return toast(res.msg || 'No se pudo guardar metodo');
  resetMethodForm();
  await loadMethods();
  await loadPermissionsSetup();
  toast(res.msg || 'Metodo guardado');
}

async function deleteMethod(id) {
  if (!(await askConfirm('Deseas eliminar este metodo?'))) return;
  const res = await callBackend('MethodBO', 'deleteMethods', { ids: [Number(id)] });
  if (!res.sts) return toast(res.msg || 'No se pudo eliminar metodo');
  await loadMethods();
  await loadPermissionsSetup();
}

async function loadUsers() {
  if (!state.profiles.length) await loadProfiles();

  const res = await callBackend('UserBO', 'getUsers');
  if (!res.sts) return toast(res.msg || 'No se pudieron cargar usuarios');

  state.users = res.data;
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';

  state.users.forEach((u) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="px-4 py-3">${u.id_user}</td><td class="px-4 py-3">${u.name} ${u.last_name}</td><td class="px-4 py-3">${u.email}</td><td class="px-4 py-3">${u.number_id}</td><td class="px-4 py-3">${u.profile}</td><td class="px-4 py-3"><button class="btn-base btn-action" onclick="editUser(${u.id_user}, ${u.id_person}, '${esc(u.name)}', '${esc(u.last_name)}', '${u.birth_date || ''}', '${esc(u.email)}', '${esc(u.number_id)}', ${u.id_profile})">Editar</button><button class="btn-danger btn-action" onclick="deleteUser(${u.id_user})">Eliminar</button></td>`;
    tbody.appendChild(tr);
  });
  styleActionButtons();
}

function resetUserForm() {
  document.getElementById('user_id_user').value = '';
  document.getElementById('user_id_person').value = '';
  document.getElementById('user_name').value = '';
  document.getElementById('user_last_name').value = '';
  document.getElementById('user_birth_date').value = '';
  document.getElementById('user_email').value = '';
  document.getElementById('user_number_id').value = '';
  document.getElementById('user_password').value = '';
  Array.from(document.getElementById('user_profiles').options).forEach((o) => { o.selected = false; });
  document.getElementById('userSubmitBtn').textContent = 'Crear usuario';
}

function editUser(idUser, idPerson, name, lastName, birthDate, email, numberId, idProfile) {
  resetUserForm();
  document.getElementById('user_id_user').value = idUser;
  document.getElementById('user_id_person').value = idPerson;
  document.getElementById('user_name').value = name;
  document.getElementById('user_last_name').value = lastName;
  document.getElementById('user_birth_date').value = birthDate;
  document.getElementById('user_email').value = email;
  document.getElementById('user_number_id').value = numberId;
  document.getElementById('userSubmitBtn').textContent = 'Actualizar usuario';

  Array.from(document.getElementById('user_profiles').options).forEach((option) => {
    option.selected = Number(option.value) === Number(idProfile);
  });
}

async function saveUser(event) {
  event.preventDefault();

  const idUser = document.getElementById('user_id_user').value;
  const idPerson = document.getElementById('user_id_person').value;
  const selectedProfiles = Array.from(document.getElementById('user_profiles').selectedOptions).map((o) => Number(o.value));

  if (!selectedProfiles.length) return toast('Selecciona al menos un perfil');

  const basePayload = {
    name: document.getElementById('user_name').value.trim(),
    lastName: document.getElementById('user_last_name').value.trim(),
    birthDate: document.getElementById('user_birth_date').value,
    email: document.getElementById('user_email').value.trim(),
    numberId: document.getElementById('user_number_id').value.trim()
  };

  let res;
  if (idUser) {
    res = await callBackend('UserBO', 'updateUser', {
      ...basePayload,
      id_user: Number(idUser),
      id_person: Number(idPerson),
      profile: selectedProfiles
    });
  } else {
    const password = document.getElementById('user_password').value;
    if (!password) return toast('La contrasena es obligatoria para crear usuario');
    res = await callBackend('UserBO', 'createUser', {
      ...basePayload,
      password,
      id_profile: selectedProfiles
    });
  }

  if (!res.sts) return toast(res.msg || 'No se pudo guardar usuario');
  resetUserForm();
  await loadUsers();
  toast(res.msg || 'Usuario guardado');
}

async function deleteUser(id) {
  if (!(await askConfirm('Deseas eliminar este usuario?'))) return;
  const res = await callBackend('UserBO', 'deleteUsers', { ids: [Number(id)] });
  if (!res.sts) return toast(res.msg || 'No se pudo eliminar usuario');
  await loadUsers();
}

async function loadPermissionsSetup() {
  if (!state.profiles.length) await loadProfiles();
  if (!state.methods.length) await loadMethods();
  document.getElementById('emptyStateText').textContent = 'Selecciona un perfil para ver los permisos';
  document.getElementById('profileSelect').value = '';
  document.getElementById('permissionsContainer').classList.add('hidden');
  document.getElementById('emptyState').classList.remove('hidden');
}

async function loadPermissions() {
  const profileId = document.getElementById('profileSelect').value;
  const container = document.getElementById('permissionsContainer');
  const empty = document.getElementById('emptyState');
  const emptyText = document.getElementById('emptyStateText');
  const filtersContainer = document.getElementById('permissionsFiltersContainer');
  const titleContainer = document.getElementById('permissionsTitleContainer');

  if (!profileId) {
    container.classList.add('hidden');
    emptyText.textContent = 'Selecciona un perfil para ver los permisos';
    empty.classList.remove('hidden');
    return;
  }

  const methodsRes = await callBackend('MethodBO', 'getMethods');
  const permissionRes = await callBackend('MethodBO', 'getPermissionMethods');
  if (!methodsRes.sts || !permissionRes.sts) return toast('No se pudieron cargar permisos');

  state.methods = methodsRes.data;
  state.permissionMethods = permissionRes.data;
  const profileIdNumber = Number(profileId);
  const visibleMethods = profileIdNumber === 1
    ? state.methods
    : state.methods.filter((m) => !PROTECTED_DEFAULT_OBJECTS.has(m.object));

  if (!visibleMethods.length) {
    container.classList.add('hidden');
    filtersContainer.classList.add('hidden');
    titleContainer.classList.add('hidden');
    document.getElementById('methodsGrid').innerHTML = '';
    emptyText.textContent = 'No hay metodos disponibles para este perfil';
    empty.classList.remove('hidden');
    return;
  }

  const activeMethodIds = state.permissionMethods
    .filter((p) => Number(p.fk_id_profile) === Number(profileId))
    .map((p) => Number(p.fk_id_method));

  renderPermissionsGrid(visibleMethods, activeMethodIds);

  empty.classList.add('hidden');
  container.classList.remove('hidden');
}

function renderPermissionsGrid(visibleMethodsParam, activeMethodIdsParam) {
  const profileId = document.getElementById('profileSelect').value;
  if (!profileId) return;

  const grid = document.getElementById('methodsGrid');

  const profileIdNumber = Number(profileId);
  const visibleMethods = visibleMethodsParam || (profileIdNumber === 1
    ? state.methods
    : state.methods.filter((m) => !PROTECTED_DEFAULT_OBJECTS.has(m.object)));

  populateObjectFilterSelect('permissionsFilterObjectName', visibleMethods);

  const activeMethodIds = activeMethodIdsParam || state.permissionMethods
    .filter((p) => Number(p.fk_id_profile) === profileIdNumber)
    .map((p) => Number(p.fk_id_method));

  const filteredMethods = filterMethodsByInputs(
    visibleMethods,
    'permissionsFilterMethodName',
    'permissionsFilterObjectName'
  );

  document.getElementById('permissionsFiltersContainer').classList.toggle('hidden', !visibleMethods.length);
  document.getElementById('permissionsTitleContainer').classList.toggle('hidden', !visibleMethods.length);

  grid.innerHTML = '';
  filteredMethods.forEach((m) => {
    const isActive = activeMethodIds.includes(Number(m.id_method));
    const card = document.createElement('div');
    card.className = 'flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:bg-slate-50';
    if (isActive) {
      card.classList.add('border-red-300', 'bg-red-50');
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'mt-1 h-4 w-4 accent-red-500';
    checkbox.value = m.id_method;
    checkbox.checked = isActive;

    card.addEventListener('click', (event) => {
      if (event.target !== checkbox) checkbox.checked = !checkbox.checked;
      card.classList.toggle('border-red-300', checkbox.checked);
      card.classList.toggle('bg-red-50', checkbox.checked);
    });

    const content = document.createElement('div');
    content.innerHTML = `<label class="text-sm font-semibold">${m.object}</label><p class="text-xs text-slate-500">${m.method}</p>`;

    card.appendChild(checkbox);
    card.appendChild(content);
    grid.appendChild(card);
  });
}

async function savePermissions() {
  const profileId = document.getElementById('profileSelect').value;
  if (!profileId) return toast('Selecciona un perfil primero');

  const selectedMethods = Array.from(document.querySelectorAll('#methodsGrid input[type="checkbox"]'))
    .filter((cb) => cb.checked)
    .map((cb) => Number(cb.value));

  const btn = document.getElementById('savePermissionsBtn');
  const originalText = btn.textContent;
  btn.textContent = 'Guardando...';
  btn.disabled = true;

  const res = await callBackend('MethodBO', 'syncPermissions', {
    id_profile: Number(profileId),
    method_ids: selectedMethods
  });

  btn.textContent = originalText;
  btn.disabled = false;

  if (!res.sts) return toast(res.msg || 'No se pudieron guardar permisos');
  toast('Permisos guardados correctamente');
}

async function init() {
  initFeedbackModal();
  const ok = await ensureSession();
  if (!ok) return;

  wireLogout();
  wireNavigation();
  await loadProfiles();
  await loadObjects();
  await loadMethods();
  await loadUsers();
  await loadPermissionsSetup();
  setActiveSection('usuarios');
}

document.addEventListener('DOMContentLoaded', init);
