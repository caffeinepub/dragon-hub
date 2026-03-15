import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

module {
  // NOTE: Do NOT add new variants here -- this type is stored in stable memory.
  // Extending it requires a migration. Use separate Maps in the actor for new roles (e.g. creator).
  public type UserRole = {
    #admin;
    #user;
    #guest;
  };

  public type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  public func initState() : AccessControlState {
    {
      var adminAssigned = false;
      userRoles = Map.empty<Principal, UserRole>();
    };
  };

  // Claim admin without a token -- only works when no admin has been assigned yet.
  public func claimFirstAdmin(state : AccessControlState, caller : Principal) : Bool {
    if (caller.isAnonymous()) { return false };
    if (state.adminAssigned) { return false };
    state.userRoles.add(caller, #admin);
    state.adminAssigned := true;
    true;
  };

  // Register caller as user (or admin if first and token matches)
  public func initialize(state : AccessControlState, caller : Principal, adminToken : Text, userProvidedToken : Text) {
    if (caller.isAnonymous()) { return };
    switch (state.userRoles.get(caller)) {
      case (?_) {};
      case (null) {
        if (not state.adminAssigned and userProvidedToken == adminToken) {
          state.userRoles.add(caller, #admin);
          state.adminAssigned := true;
        } else {
          state.userRoles.add(caller, #user);
        };
      };
    };
  };

  public func getUserRole(state : AccessControlState, caller : Principal) : UserRole {
    if (caller.isAnonymous()) { return #guest };
    switch (state.userRoles.get(caller)) {
      case (?role) { role };
      case (null) { #guest };
    };
  };

  public func assignRole(state : AccessControlState, caller : Principal, user : Principal, role : UserRole) {
    if (not (isAdmin(state, caller))) {
      Runtime.trap("Unauthorized: Only admins can assign user roles");
    };
    state.userRoles.add(user, role);
    if (role == #admin) {
      state.adminAssigned := true;
    };
  };

  public func hasPermission(state : AccessControlState, caller : Principal, requiredRole : UserRole) : Bool {
    let userRole = getUserRole(state, caller);
    if (userRole == #admin) { return true };
    if (requiredRole == #guest) { return true };
    userRole == requiredRole;
  };

  public func isAdmin(state : AccessControlState, caller : Principal) : Bool {
    getUserRole(state, caller) == #admin;
  };
};
