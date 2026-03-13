// App-level type definitions
// Add your custom types here

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

// Example type - replace with your own
// export interface Item extends BaseEntity {
//   title: string;
//   description?: string;
//   status: "active" | "inactive";
//   user_id: string;
// }
