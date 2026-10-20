# HostelHub Academic DBMS Viva Preparation Guide

This guide provides answers to common academic viva defense questions regarding database design, normalization, transactions, and concurrency control in **HostelHub**.

---

### Q1: What normal form is the HostelHub database in? Prove it.
**Answer:** The database is in **Third Normal Form (3NF)**:
1. **1NF**: All column values are atomic. There are no repeating groups or composite columns. Preferences are stored in a dedicated table (`room_preferences`) with one row per preference rather than an array column.
2. **2NF**: It is in 1NF and every non-prime attribute is fully functionally dependent on the primary key. In junction tables with composite candidate keys like `room_preferences(application_id, preference_rank)`, attributes depend on both attributes.
3. **3NF**: It is in 2NF and there are no transitive dependencies ($X \rightarrow Y$ and $Y \rightarrow Z$ where $Z$ is non-prime). Student details are referenced by `student_id` rather than redundantly copied into `allocations` or `group_members`.

---

### Q2: How do you handle concurrency control and prevent double room booking?
**Answer:**
We use **ACID Database Transactions** with pessimistic row-level locking:
1. In MySQL InnoDB, we execute `START TRANSACTION`.
2. We query candidates using `SELECT ... FOR UPDATE`, placing exclusive write locks on the room and application records.
3. The allocation engine assigns the room in memory, writes the assignment into `allocations`, and commits the transaction.
4. Any concurrent transaction attempting to read or write the same room is blocked until the first transaction commits or rolls back, preventing double-booking (race conditions).

---

### Q3: Why is the group leader calculated by the system rather than chosen by the students?
**Answer:**
To prevent **merit circumvention**. In a merit-based allocation system, the group priority is determined by the member with the best merit rank ($MIN(\text{merit\_rank})$). If the frontend allowed students to choose an arbitrary leader, a group might game the system or submit corrupted data. The backend always recalculates `leader_rank` by executing `SELECT MIN(merit_rank) FROM students WHERE id IN (members)`.

---

### Q4: How does the system preserve historical allocation data when a batch vacates?
**Answer:**
Rather than executing a destructive `DELETE FROM allocations`, we perform a soft-state lifecycle transition:
```sql
UPDATE allocations SET status = 'VACATED', vacated_at = NOW() WHERE batch_id = ?;
UPDATE batches SET status = 'ARCHIVED' WHERE id = ?;
```
Because the active uniqueness constraint applies only to active records (`status = 'ACTIVE'`), the 80 physical rooms become immediately available for the next academic cycle while the university retains an audit trail of which students lived in which room during past years.

---

### Q5: What indexes were created and why?
**Answer:**
1. `rooms (capacity, is_active)`: Accelerates filtering candidate rooms matching a group's target capacity.
2. `group_members (batch_id, student_id)`: Enforces the constraint that a student can only belong to one active group per batch in $\mathcal{O}(1)$ time.
3. `room_preferences (application_id, preference_rank)`: Enforces distinct preference ranks 1 through 5 and accelerates sequence retrieval during allocation.
4. `allocations (batch_id, room_id, status)`: Accelerates checking whether a room is already reserved in the current batch.

---

### Q6: What is the time complexity of the allocation algorithm?
**Answer:**
$\mathcal{O}(N \log N)$ where $N$ is the number of applications.
- Sorting $N$ applications by leader rank takes $\mathcal{O}(N \log N)$.
- Iterating over each application and checking up to 5 preferences using $\mathcal{O}(1)$ hash set lookups takes $\mathcal{O}(5N) = \mathcal{O}(N)$.
- Total time is dominated by the sort: $\mathcal{O}(N \log N)$.

