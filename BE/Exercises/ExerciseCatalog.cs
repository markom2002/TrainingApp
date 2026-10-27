namespace BE.Exercises;

public record ExerciseDefinition(string Id, string Name, string MuscleGroup, string Equipment, bool Timed = false);

public static class ExerciseCatalog
{
    public static readonly IReadOnlyList<ExerciseDefinition> All = new ExerciseDefinition[]
    {
        new("bench-press", "Bench press", "Chest", "Barbell"), new("incline-dumbbell-press", "Incline dumbbell press", "Chest", "Dumbbells"), new("push-up", "Push-up", "Chest", "Bodyweight"), new("cable-fly", "Cable fly", "Chest", "Cable"),
        new("lat-pulldown", "Lat pulldown", "Back", "Machine"), new("seated-row", "Seated cable row", "Back", "Cable"), new("pull-up", "Pull-up", "Back", "Bodyweight"), new("dumbbell-row", "Single-arm row", "Back", "Dumbbells"),
        new("shoulder-press", "Shoulder press", "Shoulders", "Dumbbells"), new("lateral-raise", "Lateral raise", "Shoulders", "Dumbbells"), new("face-pull", "Face pull", "Shoulders", "Cable"), new("reverse-fly", "Reverse fly", "Shoulders", "Dumbbells"),
        new("biceps-curl", "Biceps curl", "Biceps", "Dumbbells"), new("hammer-curl", "Hammer curl", "Biceps", "Dumbbells"), new("preacher-curl", "Preacher curl", "Biceps", "Machine"),
        new("triceps-pushdown", "Triceps pushdown", "Triceps", "Cable"), new("overhead-extension", "Overhead triceps extension", "Triceps", "Dumbbells"), new("triceps-dip", "Triceps dip", "Triceps", "Bodyweight"),
        new("wrist-curl", "Wrist curl", "Forearms", "Dumbbells"), new("farmer-carry", "Farmer carry", "Forearms", "Dumbbells", true),
        new("back-squat", "Back squat", "Quads", "Barbell"), new("goblet-squat", "Goblet squat", "Quads", "Dumbbells"), new("leg-press", "Leg press", "Quads", "Machine"), new("leg-extension", "Leg extension", "Quads", "Machine"),
        new("romanian-deadlift", "Romanian deadlift", "Hamstrings", "Barbell"), new("leg-curl", "Leg curl", "Hamstrings", "Machine"), new("single-leg-rdl", "Single-leg Romanian deadlift", "Hamstrings", "Dumbbells"),
        new("hip-thrust", "Hip thrust", "Glutes", "Barbell"), new("glute-bridge", "Glute bridge", "Glutes", "Bodyweight"), new("cable-kickback", "Cable kickback", "Glutes", "Cable"), new("bulgarian-split-squat", "Bulgarian split squat", "Glutes", "Dumbbells"),
        new("standing-calf-raise", "Standing calf raise", "Calves", "Machine"), new("seated-calf-raise", "Seated calf raise", "Calves", "Machine"),
        new("plank", "Plank", "Core", "Bodyweight", true), new("dead-bug", "Dead bug", "Core", "Bodyweight"), new("hanging-leg-raise", "Hanging leg raise", "Core", "Bodyweight"), new("cable-crunch", "Cable crunch", "Core", "Cable"),
        new("deadlift", "Deadlift", "Full body", "Barbell"), new("kettlebell-swing", "Kettlebell swing", "Full body", "Kettlebell"), new("burpee", "Burpee", "Full body", "Bodyweight"),
        new("treadmill", "Treadmill", "Cardio", "Machine", true), new("cycling", "Stationary cycling", "Cardio", "Machine", true), new("rowing", "Rowing ergometer", "Cardio", "Machine", true), new("jump-rope", "Jump rope", "Cardio", "Rope", true),
        new("hip-flexor-stretch", "Hip flexor stretch", "Mobility", "Bodyweight", true), new("thoracic-rotation", "Thoracic rotation", "Mobility", "Bodyweight"), new("hamstring-stretch", "Hamstring stretch", "Mobility", "Bodyweight", true)
    };
    private static readonly IReadOnlyDictionary<string, ExerciseDefinition> ById = All.ToDictionary(e => e.Id, StringComparer.Ordinal);
    public static ExerciseDefinition? Find(string id) => ById.TryGetValue(id, out var exercise) ? exercise : null;
}
