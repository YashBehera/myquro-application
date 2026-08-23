/**
 * Backend Permission System
 * Defines granular permissions based on restaurant roles
 */

export interface RestaurantPermissions {
  // Tables
  canViewTables: boolean;
  canCreateTables: boolean;
  canUpdateTables: boolean;
  canDeleteTables: boolean;
  
  // Menu
  canViewMenu: boolean;
  canCreateMenuCategories: boolean;
  canUpdateMenuCategories: boolean;
  canDeleteMenuCategories: boolean;
  canCreateMenuItems: boolean;
  canUpdateMenuItems: boolean;
  canDeleteMenuItems: boolean;
  
  // Orders
  canViewOrders: boolean;
  canUpdateOrderStatus: boolean;
  canCancelOrders: boolean;
  canViewOrderHistory: boolean;
  
  // Reservations
  canViewReservations: boolean;
  canCreateReservations: boolean;
  canUpdateReservations: boolean;
  canCancelReservations: boolean;
  canAssignTables: boolean;
  
  // Staff
  canViewStaff: boolean;
  canInviteStaff: boolean;
  canUpdateStaffRoles: boolean;
  canRemoveStaff: boolean;
  
  // Analytics & Settings
  canViewAnalytics: boolean;
  canUpdateSettings: boolean;
  canManagePayments: boolean;
}

const rolePermissions: Record<'owner' | 'manager' | 'staff', RestaurantPermissions> = {
  owner: {
    // Tables
    canViewTables: true,
    canCreateTables: true,
    canUpdateTables: true,
    canDeleteTables: true,
    
    // Menu
    canViewMenu: true,
    canCreateMenuCategories: true,
    canUpdateMenuCategories: true,
    canDeleteMenuCategories: true,
    canCreateMenuItems: true,
    canUpdateMenuItems: true,
    canDeleteMenuItems: true,
    
    // Orders
    canViewOrders: true,
    canUpdateOrderStatus: true,
    canCancelOrders: true,
    canViewOrderHistory: true,
    
    // Reservations
    canViewReservations: true,
    canCreateReservations: true,
    canUpdateReservations: true,
    canCancelReservations: true,
    canAssignTables: true,
    
    // Staff
    canViewStaff: true,
    canInviteStaff: true,
    canUpdateStaffRoles: true,
    canRemoveStaff: true,
    
    // Analytics & Settings
    canViewAnalytics: true,
    canUpdateSettings: true,
    canManagePayments: true,
  },
  manager: {
    // Tables
    canViewTables: true,
    canCreateTables: true,
    canUpdateTables: true,
    canDeleteTables: true,
    
    // Menu
    canViewMenu: true,
    canCreateMenuCategories: true,
    canUpdateMenuCategories: true,
    canDeleteMenuCategories: true,
    canCreateMenuItems: true,
    canUpdateMenuItems: true,
    canDeleteMenuItems: true,
    
    // Orders
    canViewOrders: true,
    canUpdateOrderStatus: true,
    canCancelOrders: true,
    canViewOrderHistory: true,
    
    // Reservations
    canViewReservations: true,
    canCreateReservations: true,
    canUpdateReservations: true,
    canCancelReservations: true,
    canAssignTables: true,
    
    // Staff
    canViewStaff: true,
    canInviteStaff: true,
    canUpdateStaffRoles: false, // Only owners can change roles
    canRemoveStaff: false, // Only owners can remove staff
    
    // Analytics & Settings
    canViewAnalytics: true,
    canUpdateSettings: false, // Only owners can change settings
    canManagePayments: true,
  },
  staff: {
    // Tables
    canViewTables: true,
    canCreateTables: false,
    canUpdateTables: false,
    canDeleteTables: false,
    
    // Menu
    canViewMenu: true,
    canCreateMenuCategories: false,
    canUpdateMenuCategories: false,
    canDeleteMenuCategories: false,
    canCreateMenuItems: false,
    canUpdateMenuItems: false,
    canDeleteMenuItems: false,
    
    // Orders
    canViewOrders: true,
    canUpdateOrderStatus: true,
    canCancelOrders: false,
    canViewOrderHistory: true,
    
    // Reservations
    canViewReservations: true,
    canCreateReservations: true,
    canUpdateReservations: true,
    canCancelReservations: false,
    canAssignTables: true,
    
    // Staff
    canViewStaff: true,
    canInviteStaff: false,
    canUpdateStaffRoles: false,
    canRemoveStaff: false,
    
    // Analytics & Settings
    canViewAnalytics: false,
    canUpdateSettings: false,
    canManagePayments: false,
  },
};

/**
 * Get permissions for a specific role
 */
export function getPermissions(role: 'owner' | 'manager' | 'staff'): RestaurantPermissions {
  return rolePermissions[role];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: 'owner' | 'manager' | 'staff',
  permission: keyof RestaurantPermissions
): boolean {
  return rolePermissions[role][permission];
}

/**
 * Check multiple permissions at once
 */
export function hasAllPermissions(
  role: 'owner' | 'manager' | 'staff',
  permissions: (keyof RestaurantPermissions)[]
): boolean {
  return permissions.every(permission => rolePermissions[role][permission]);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  role: 'owner' | 'manager' | 'staff',
  permissions: (keyof RestaurantPermissions)[]
): boolean {
  return permissions.some(permission => rolePermissions[role][permission]);
}
