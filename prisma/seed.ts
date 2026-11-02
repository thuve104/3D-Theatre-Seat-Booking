import { getDbState, saveDbState } from "../src/lib/db";

async function main() {
  console.log("Seeding CINEVERSE 3D Cinema Database...");
  const state = getDbState();
  saveDbState(state);
  console.log(
    `Seeded ${state.movies.length} movies, ${state.cinemas.length} cinemas, ${state.auditoriums.length} auditoriums, ${state.seats.length} 3D seats, and ${state.shows.length} shows.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
