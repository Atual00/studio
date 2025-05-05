
'use client';

const USER_STORAGE_KEY = 'licitaxUsers';

export interface User {
  id: string;
  username: string;
  // passwordHash: string; // In a real app, store hash, not plain password
  role: 'admin' | 'user';
}

// --- Mock Data (Replace with API) ---
// This list serves as the initial seed for localStorage if it's empty.
let initialMockUsers: User[] = [
  { id: 'user-admin-001', username: 'admin', role: 'admin' },
  { id: 'user-user-002', username: 'user', role: 'user' },
  { id: 'user-joao-003', username: 'joao', role: 'user' }, // Ensure Joao is in the initial seed
];

// --- Helper Functions (using localStorage for simulation) ---

const getUsersFromStorage = (): User[] => {
  if (typeof window === 'undefined') return [...initialMockUsers]; // Return initial mock on server
  const storedData = localStorage.getItem(USER_STORAGE_KEY);
  try {
    let users: User[] = storedData ? JSON.parse(storedData) : [];

    // Ensure default mock users (including joao) are present if storage was cleared or empty initially
    initialMockUsers.forEach(mockUser => {
        if (!users.some(u => u.username === mockUser.username)) {
            users.push(mockUser);
        }
    });

    // Filter duplicates just in case (e.g., if localStorage had old data)
    users = users.filter((user, index, self) =>
        index === self.findIndex((u) => (u.id === user.id || u.username === user.username))
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
    // Filter duplicates before saving
     const uniqueUsers = users.filter((user, index, self) =>
        index === self.findIndex((u) => (u.id === user.id || u.username === user.username))
    );
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(uniqueUsers));
  } catch (e) {
    console.error("Error saving users to localStorage:", e);
  }
};

// Initialize storage with potentially updated mock data if it doesn't exist or is outdated
if (typeof window !== 'undefined') {
    const existingUsers = getUsersFromStorage(); // Load potentially existing + ensure defaults
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
 * @returns A promise that resolves to the newly created User or null on failure.
 */
export const addUser = async (username: string, password?: string, role: 'admin' | 'user' = 'user'): Promise<User | null> => {
  console.log("Adding new user:", username, " Role:", role);
  await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay

  if (!username || !password) { // Basic validation
     throw new Error("Usuário e senha são obrigatórios.");
  }

  const users = getUsersFromStorage();

  // Check for duplicate username
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error(`Usuário "${username}" já existe.`);
  }

  // !!! IMPORTANT: HASH THE PASSWORD HERE in a real application !!!
  // const passwordHash = await bcrypt.hash(password, 10); // Example using bcrypt

  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    username: username,
    // passwordHash: passwordHash,
    role: role,
  };

  const updatedUsers = [...users, newUser];
  saveUsersToStorage(updatedUsers);

   // Add to MOCK_USERS in AuthContext as well for login check (this is a bit hacky due to mock setup)
   // This is not ideal, ideally AuthContext reads from the service/storage on login
   if (typeof window !== 'undefined') {
       try {
          // Accessing global mock (HACK - REMOVE in real app)
          const authContextUsers = (window as any).MOCK_USERS || [];
           if (authContextUsers && !authContextUsers.some((u: any) => u.username === newUser.username)) {
               // Add with plain password for mock login check
               authContextUsers.push({username: newUser.username, password: password, role: newUser.role});
           }
       } catch (e) { console.warn("Could not update AuthContext MOCK_USERS"); }
   }

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
   // Remove from AuthContext MOCK_USERS as well (HACK - REMOVE in real app)
    if (typeof window !== 'undefined' && userToDelete) {
       try {
           let authContextUsers = (window as any).MOCK_USERS || [];
           authContextUsers = authContextUsers.filter((u: any) => u.username !== userToDelete.username);
           (window as any).MOCK_USERS = authContextUsers;
       } catch (e) { console.warn("Could not update AuthContext MOCK_USERS on delete"); }
    }
  return true;
};

// --- Potential Future Functions ---
// export const updateUser = async (id: string, data: Partial<User>): Promise<boolean> => { ... };
// export const changePassword = async (id: string, newPassword: string): Promise<boolean> => { ... };
