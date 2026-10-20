# HostelHub Merit-Based Allocation Algorithm

## 1. Algorithm Objective & Philosophy
The allocation algorithm determines room assignments for university students applying individually or in groups. The procedure is:
- **Merit-Driven**: Applications are evaluated in ascending order of group leader merit rank (Rank 1 has highest priority).
- **Preference-Driven**: For each group, choices are evaluated strictly in sequence $1 \rightarrow 2 \rightarrow 3 \rightarrow 4 \rightarrow 5$.
- **Group Integrity**: An entire group is assigned to a single room matching its capacity. Groups are never split across multiple rooms.
- **Deterministic**: Given the same inputs, the algorithm yields identical results.

---

## 2. Why Allocation Is Admin-Triggered Rather Than On-Submission
In university merit allocation systems:
1. **Fairness**: If allocations occurred immediately upon submission (first-come, first-served), a student with merit rank 80 who applied on Monday would get a prime single room ahead of a rank 1 scholar who applied on Wednesday.
2. **Global Optimization**: Merit ranking is only meaningful after all eligible applications have been collected and submissions are closed.
3. **Auditability**: An administrator can inspect draft outcomes, reconcile capacity metrics, and publish results in a controlled batch.

---

## 3. Algorithm Pseudocode

```text
ALGORITHM RunMeritAllocation(Applications, Rooms, InitialOccupiedRoomIds):
  INPUT:
    Applications: List of Applications {id, groupId, targetCapacity, leaderRank, members, preferences[1..5]}
    Rooms: List of Physical Rooms {id, blockId, roomNumber, capacity, isActive}
    InitialOccupiedRoomIds: Set of already occupied Room IDs

  OUTPUT:
    Allocations: List of Successful Allocations
    Unallocated: List of Waitlisted Applications with Reason
    Summary: Audit counts of allocations and preference distributions

  1. RoomMap = Map(Rooms.id -> Room)
  2. OccupiedRooms = Set(InitialOccupiedRoomIds)
  3. AllocatedStudents = Set()
  4. Allocations = []
  5. Unallocated = []

  6. Sort Applications by (leaderRank ASC, id ASC)

  7. FOR EACH App IN Applications DO:
       IF Length(App.members) != App.targetCapacity THEN:
           Unallocated.Append(App, REASON: "INVALID_APPLICATION")
           CONTINUE

       IF ANY student IN App.members IN AllocatedStudents THEN:
           Unallocated.Append(App, REASON: "STUDENT_ALREADY_ALLOCATED")
           CONTINUE

       AllocatedRoom = NULL
       SatisfiedRank = NULL

       // Sort preferences by rank ascending (1..5)
       SortedPrefs = Sort(App.preferences, by preferenceRank ASC)

       FOR EACH Pref IN SortedPrefs DO:
           CandidateRoom = RoomMap.Get(Pref.roomId)

           IF CandidateRoom IS NULL OR CandidateRoom.isActive == FALSE THEN:
               CONTINUE

           IF CandidateRoom.capacity != App.targetCapacity THEN:
               CONTINUE

           IF CandidateRoom.id IN OccupiedRooms THEN:
               CONTINUE // Fallback to next preference!

           // Found first available preference!
           AllocatedRoom = CandidateRoom
           SatisfiedRank = Pref.preferenceRank
           BREAK

       IF AllocatedRoom IS NOT NULL THEN:
           OccupiedRooms.Add(AllocatedRoom.id)
           FOR EACH sId IN App.members DO:
               AllocatedStudents.Add(sId)

           Allocations.Append({
               applicationId: App.id,
               groupId: App.groupId,
               roomId: AllocatedRoom.id,
               preferenceRankSatisfied: SatisfiedRank,
               members: App.members
           })
       ELSE:
           Unallocated.Append({
               applicationId: App.id,
               groupId: App.groupId,
               reason: "NO_PREFERENCE_AVAILABLE"
           })

  8. RETURN { Allocations, Unallocated, Summary }
```

---

## 4. Complexity Analysis

- **Time Complexity**:
  - Sorting $N$ applications: $\mathcal{O}(N \log N)$.
  - Outer loop processes $N$ applications.
  - Inner loop checks at most $K = 5$ preferences. Room lookup in `Map` and membership in `Set` takes $\mathcal{O}(1)$.
  - Total Time: $\mathcal{O}(N \log N + 5N) = \mathbf{\mathcal{O}(N \log N)}$. For $N = 100$ students, execution finishes in under $10\text{ milliseconds}$.
- **Space Complexity**:
  - Auxiliary sets for occupied room IDs ($\le 80$) and allocated student IDs ($\le 100$): $\mathbf{\mathcal{O}(R + S)}$ where $R$ is rooms and $S$ is students. Memory footprint is minimal ($\sim \text{a few kilobytes}$).

