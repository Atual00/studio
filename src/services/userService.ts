

'use client';

const USER_STORAGE_KEY = 'licitaxUsers';

export interface User {
  id: string;
  username: string;
  fullName?: string; // Added field
  cpf?: string; // Added field
  // passwordHash: string; // In a real app, store hash, not plain password
  role: 'admin' | 'user';
}

// --- Mock Data (Replace with API) ---
// This list serves as the initial seed for localStorage if it's empty.
let initialMockUsers: User[] = [
  { id: 'user-admin-001', username: 'admin', fullName: 'Administrador', cpf: '000.000.000-00', role: 'admin' },
  { id: 'user-user-002', username: 'user', fullName: 'Usuário Padrão', cpf: '111.111.111-11', role: 'user' },
  { id: 'user-joao-003', username: 'joao', fullName: 'Joao Silva', cpf: '123.456.789-00', role: 'admin' }, // Ensure JOAO is admin here too
];

// --- Helper Functions (using localStorage for simulation) ---

const getUsersFromStorage = (): User[] => {
  if (typeof window === 'undefined') return [...initialMockUsers]; // Return initial mock on server
  const storedData = localStorage.getItem(USER_STORAGE_KEY);
  try {
    let users: User[] = storedData ? JSON.parse(storedData) : [];

    // Ensure default mock users (including joao) are present if storage was cleared or empty initially
    // And update JOAO role and add missing fields (fullName, cpf) if found with old data
    initialMockUsers.forEach(mockUser => {
        const existingUserIndex = users.findIndex(u => u.username.toLowerCase() === mockUser.username.toLowerCase());
        if (existingUserIndex === -1) {
            users.push(mockUser); // Add if missing
        } else {
            // Update role if it differs for known mock users (especially admin roles)
            if (users[existingUserIndex].role !== mockUser.role && ['admin', 'joao'].includes(mockUser.username.toLowerCase())) {
                 users[existingUserIndex].role = mockUser.role;
            }
            // Add missing fields
            if (!users[existingUserIndex].fullName) {
                 users[existingUserIndex].fullName = mockUser.fullName;
            }
             if (!users[existingUserIndex].cpf) {
                 users[existingUserIndex].cpf = mockUser.cpf;
            }
        }
    });

    // Filter duplicates just in case (e.g., if localStorage had old data)
    users = users.filter((user, index, self) =>
        index === self.findIndex((u) => (u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase()))
    );

    return users;
  } catch (e) {
    console.error("Error parsing users from localStorage:", e);
    localStorage.removeItem(USER_STORAGE_KEY); // Clear corrupted data
    return [...initialMockUsers]; // Fallback to initial mock data on error
  }
};

const saveUsersToStorage = (users: User[]): void => {
  if (typeof window === 'undefined') return;
  try {
    // Filter duplicates before saving (case-insensitive username check)
     const uniqueUsers = users.filter((user, index, self) =>
        index === self.findIndex((u) => (u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase()))
    );
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(uniqueUsers));
  } catch (e) {
    console.error("Error saving users to localStorage:", e);
  }
};

// Initialize storage with potentially updated mock data if it doesn't exist or is outdated
if (typeof window !== 'undefined') {
    const existingUsers = getUsersFromStorage(); // Load potentially existing + ensure defaults + update roles/fields
    saveUsersToStorage(existingUsers); // Save the potentially updated list
}


// --- Service Functions ---

/**
 * Fetches a list of all users.
 * @returns A promise that resolves to an array of User objects.
 */
export const fetchUsers = async (): Promise<User[]> => {
  console.log('Fetching users...');
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API delay
  return getUsersFromStorage();
};

/**
 * Adds a new user.
 * @param username The username for the new user.
 * @param password The password for the new user (INSECURE - should be hashed).
 * @param role The role for the new user (defaults to 'user').
 * @param fullName The full name of the user.
 * @param cpf The CPF of the user.
 * @returns A promise that resolves to the newly created User or null on failure.
 */
export const addUser = async (
    username: string,
    password?: string,
    role: 'admin' | 'user' = 'user',
    fullName?: string, // Added parameter
    cpf?: string // Added parameter
): Promise<User | null> => {
  console.log("Adding new user:", username, " Role:", role, " FullName:", fullName, " CPF:", cpf);
  await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay

  if (!username || !password || !fullName || !cpf) { // Basic validation including new fields
     throw new Error("Nome completo, CPF, usuário e senha são obrigatórios.");
  }

  const users = getUsersFromStorage();
  const lowerCaseUsername = username.toLowerCase();

  // Check for duplicate username (case-insensitive)
  if (users.some(u => u.username.toLowerCase() === lowerCaseUsername)) {
    throw new Error(`Usuário "${username}" já existe.`);
  }
   // Check for duplicate CPF
   if (users.some(u => u.cpf === cpf)) {
    throw new Error(`CPF "${cpf}" já está cadastrado para outro usuário.`);
  }


  // !!! IMPORTANT: HASH THE PASSWORD HERE in a real application !!!
  // const passwordHash = await bcrypt.hash(password, 10); // Example using bcrypt

  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    username: username, // Store username as provided
    fullName: fullName, // Store full name
    cpf: cpf, // Store CPF
    // passwordHash: passwordHash,
    role: role,
  };

  const updatedUsers = [...users, newUser];
  saveUsersToStorage(updatedUsers);

  return newUser;
};

/**
 * Deletes a user by ID.
 * @param id The ID of the user to delete.
 * @returns A promise that resolves to true on success, false on failure.
 */
export const deleteUser = async (id: string): Promise<boolean> => {
  console.log(`Deleting user ID: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

  const users = getUsersFromStorage();
  const userToDelete = users.find(u => u.id === id);

  if (!userToDelete) {
     console.error(`User delete failed: User with ID ${id} not found.`);
     return false;
  }

  // Basic safeguard: prevent deleting the primary 'admin' user if needed
  // if (userToDelete.username === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
  //   throw new Error("Não é possível excluir o último administrador.");
  // }

  const updatedUsers = users.filter(u => u.id !== id);

  if (users.length === updatedUsers.length) {
    return false; // Should not happen if find succeeded
  }

  saveUsersToStorage(updatedUsers);

  return true;
};

// --- Potential Future Functions ---
// export const updateUser = async (id: string, data: Partial<User>): Promise<boolean> => { ... };
// export const changePassword = async (id: string, newPassword: string): Promise<boolean> => { ... };
```