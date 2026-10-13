import { addMember, createOutlet, createUser, createWorkspace, first, roleId, rpc, type User } from "./helpers";

export type Hotel = {
  ws: string;
  owner: User;
  main: string;
  lounge: string;
  execChef: User;
  editor: User;
  viewer: User;
  loungeChef: User; // workspace Viewer, restricted to the Lounge as Outlet Chef
  pendingInviteId: string;
};

/** A hotel workspace with two outlets and members of every kind. */
export async function createHotel(name = "Hotel"): Promise<Hotel> {
  const owner = await createUser({ fullName: `${name} Owner` });
  const ws = await createWorkspace(owner, name);
  const main = await createOutlet(owner, ws, "Main Restaurant");
  const lounge = await createOutlet(owner, ws, "Lounge Bar");
  const execChef = await addMember(owner, ws, "executive_chef");
  const editor = await addMember(owner, ws, "editor");
  const viewer = await addMember(owner, ws, "viewer");
  const loungeChef = await addMember(owner, ws, "viewer", {
    allOutlets: false,
    outletGrants: [{ outlet_id: lounge, role_id: await roleId(ws, "outlet_chef") }],
  });
  const { invitation_id } = first(await rpc<{ invitation_id: string }>(owner, "create_invitation", {
    p_workspace_id: ws, p_email: `pending-${ws.slice(0, 6)}@example.test`, p_role_id: await roleId(ws, "viewer"),
  }));
  return { ws, owner, main, lounge, execChef, editor, viewer, loungeChef, pendingInviteId: invitation_id };
}
