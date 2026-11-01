use std::collections::{HashMap, VecDeque};
use crate::models::*;

#[derive(Clone, Debug)]
struct Edge {
    to: usize,
    capacity: i32,
    cost: i64,
    flow: i32,
    rev: usize,
}

struct MinCostBipartiteGraph {
    adj: Vec<Vec<Edge>>,
    num_nodes: usize,
}

impl MinCostBipartiteGraph {
    fn new(num_nodes: usize) -> Self {
        Self {
            adj: vec![Vec::new(); num_nodes],
            num_nodes,
        }
    }

    fn add_edge(&mut self, from: usize, to: usize, capacity: i32, cost: i64) {
        let fwd_idx = self.adj[from].len();
        let rev_idx = self.adj[to].len();
        self.adj[from].push(Edge {
            to,
            capacity,
            cost,
            flow: 0,
            rev: rev_idx,
        });
        self.adj[to].push(Edge {
            to: from,
            capacity: 0,
            cost: -cost,
            flow: 0,
            rev: fwd_idx,
        });
    }

    fn max_weight_matching(&mut self, source: usize, sink: usize) -> Vec<(usize, usize)> {
        while let Some(path) = self.spfa(source, sink) {
            let mut curr = sink;
            while curr != source {
                let (prev, edge_idx) = path[curr];
                self.adj[prev][edge_idx].flow += 1;
                let rev_idx = self.adj[prev][edge_idx].rev;
                self.adj[curr][rev_idx].flow -= 1;
                curr = prev;
            }
        }

        let mut matches = Vec::new();
        for u in 0..self.adj.len() {
            if u == source || u == sink {
                continue;
            }
            for edge in &self.adj[u] {
                if edge.to != source && edge.to != sink && edge.capacity > 0 && edge.flow > 0 {
                    matches.push((u, edge.to));
                }
            }
        }
        matches
    }

    fn spfa(&self, source: usize, sink: usize) -> Option<Vec<(usize, usize)>> {
        let mut dist = vec![i64::MAX; self.num_nodes];
        let mut in_queue = vec![false; self.num_nodes];
        let mut parent = vec![(0usize, 0usize); self.num_nodes];
        let mut queue = VecDeque::new();

        dist[source] = 0;
        queue.push_back(source);
        in_queue[source] = true;

        while let Some(u) = queue.pop_front() {
            in_queue[u] = false;
            let d_u = dist[u];

            for (i, edge) in self.adj[u].iter().enumerate() {
                if edge.capacity > edge.flow {
                    let v = edge.to;
                    let new_dist = d_u.saturating_add(edge.cost);
                    if new_dist < dist[v] {
                        dist[v] = new_dist;
                        parent[v] = (u, i);
                        if !in_queue[v] {
                            queue.push_back(v);
                            in_queue[v] = true;
                        }
                    }
                }
            }
        }

        if dist[sink] < i64::MAX {
            Some(parent)
        } else {
            None
        }
    }
}

pub fn allocate_all_classrooms(
    req: &TimetableRequest,
    current_placements: &[LessonAssignment],
) -> RoomAllocationResult {
    let _days = req.resolved_days();
    let periods_per_day = req.resolved_periods_per_day();
    let total_slots = req.total_slots();

    let lesson_map: HashMap<&str, &Lesson> = req.lessons.iter().map(|l| (l.id.as_str(), l)).collect();
    let class_map: HashMap<&str, &ClassGroup> = req.classes.iter().map(|c| (c.id.as_str(), c)).collect();
    let subject_map: HashMap<&str, &Subject> = req.subjects.iter().map(|s| (s.id.as_str(), s)).collect();

    let mut placements_by_slot: HashMap<u8, Vec<&LessonAssignment>> = HashMap::new();
    for p in current_placements {
        placements_by_slot.entry(p.slot).or_default().push(p);
    }

    let mut final_allocations: HashMap<String, String> = HashMap::new();
    let mut unallocated_lessons: Vec<String> = Vec::new();
    let mut teacher_room_at_slot: HashMap<(&str, u8), &str> = HashMap::new();

    for s in 0..total_slots {
        let slot_pl = match placements_by_slot.get(&s) {
            Some(pl) => pl,
            None => continue,
        };
        if slot_pl.is_empty() {
            continue;
        }

        // Available rooms at slot s
        let mut available_rooms: Vec<&Room> = req.rooms
            .iter()
            .filter(|r| !r.unavailable_slots.contains(&s))
            .collect();

        // 1. Process Pinned Lessons
        for p in slot_pl {
            if let Some(lesson) = lesson_map.get(p.lesson_id.as_str()) {
                if lesson.is_pinned {
                    let pin_r_id = lesson.pinned_room_id.as_deref().or(lesson.room_id.as_deref());
                    if let Some(pr_id) = pin_r_id {
                        final_allocations.insert(lesson.id.clone(), pr_id.to_string());
                        available_rooms.retain(|r| r.id != pr_id);
                        teacher_room_at_slot.insert((&lesson.teacher_id, s), pr_id);
                    }
                }
            }
        }

        // 2. Identify unpinned lessons for this slot
        let unassigned_lessons: Vec<&Lesson> = slot_pl
            .iter()
            .filter_map(|p| lesson_map.get(p.lesson_id.as_str()).copied())
            .filter(|l| !l.is_pinned || (l.pinned_room_id.is_none() && l.room_id.is_none()))
            .collect();

        if unassigned_lessons.is_empty() {
            continue;
        }

        if available_rooms.is_empty() {
            for l in &unassigned_lessons {
                unallocated_lessons.push(l.id.clone());
            }
            continue;
        }

        // 3. Build Bipartite Graph
        let num_lessons = unassigned_lessons.len();
        let num_rooms = available_rooms.len();

        let source = 0;
        let left_start = 1;
        let right_start = left_start + num_lessons;
        let sink = right_start + num_rooms;
        let total_nodes = sink + 1;

        let mut graph = MinCostBipartiteGraph::new(total_nodes);

        for i in 0..num_lessons {
            graph.add_edge(source, left_start + i, 1, 0);
        }
        for j in 0..num_rooms {
            graph.add_edge(right_start + j, sink, 1, 0);
        }

        for (i, lesson) in unassigned_lessons.iter().enumerate() {
            let class = class_map.get(lesson.class_id.as_str());
            let subject = subject_map.get(lesson.subject_id.as_str());
            let sc = lesson.student_count
                .or_else(|| class.and_then(|c| c.student_count))
                .unwrap_or(0);

            for (j, room) in available_rooms.iter().enumerate() {
                // Capacity check
                if let Some(cap) = room.capacity {
                    if sc > cap {
                        continue;
                    }
                }

                // Features and room type check
                let mut feat_ok = true;
                if let Some(subj) = subject {
                    if let Some(ref rt) = subj.required_room_type {
                        if !room.has_feature_or_type(rt) {
                            feat_ok = false;
                        }
                    }
                    for req_f in &subj.required_features {
                        if !room.has_feature_or_type(req_f) {
                            feat_ok = false;
                            break;
                        }
                    }
                }
                for req_f in &lesson.required_features {
                    if !room.has_feature_or_type(req_f) {
                        feat_ok = false;
                        break;
                    }
                }
                if !feat_ok {
                    continue;
                }

                // Base weight
                let mut weight: i64 = 1000;

                // Capacity slack fit (minimal wasted seats)
                let cap = room.capacity.unwrap_or(sc + 10);
                let slack = cap.saturating_sub(sc);
                weight -= (slack.min(50) as i64) * 2;

                // Homeroom proximity bonus (+500)
                if let Some(c) = class {
                    if let Some(ref hr) = c.home_room_id {
                        if hr == &room.id {
                            weight += 500;
                        }
                    }
                }

                // Teacher room continuity bonus (+150)
                if s > 0 && (s % periods_per_day) > 0 {
                    if let Some(&prev_r_id) = teacher_room_at_slot.get(&(lesson.teacher_id.as_str(), s - 1)) {
                        if prev_r_id == room.id.as_str() {
                            weight += 150;
                        }
                    }
                }

                // Initial/preferred room preference
                if lesson.pinned_room_id.as_deref() == Some(room.id.as_str())
                    || lesson.initial_room_id.as_deref() == Some(room.id.as_str())
                    || lesson.room_id.as_deref() == Some(room.id.as_str())
                {
                    weight += 50_000;
                }

                graph.add_edge(left_start + i, right_start + j, 1, -weight);
            }
        }

        let matches = graph.max_weight_matching(source, sink);
        let mut matched_lessons = vec![false; num_lessons];

        for (u, v) in matches {
            if u >= left_start && u < right_start && v >= right_start && v < sink {
                let l_idx = u - left_start;
                let r_idx = v - right_start;
                let lesson = unassigned_lessons[l_idx];
                let room = available_rooms[r_idx];
                final_allocations.insert(lesson.id.clone(), room.id.clone());
                teacher_room_at_slot.insert((&lesson.teacher_id, s), room.id.as_str());
                matched_lessons[l_idx] = true;
            }
        }

        for (i, &matched) in matched_lessons.iter().enumerate() {
            if !matched {
                unallocated_lessons.push(unassigned_lessons[i].id.clone());
            }
        }
    }

    let mut updated_assignments = Vec::with_capacity(current_placements.len());
    for p in current_placements {
        let allocated_room = final_allocations.get(&p.lesson_id).cloned().unwrap_or_else(|| p.room_id.clone());
        let mut up = p.clone();
        up.room_id = allocated_room;
        updated_assignments.push(up);
    }

    let success = unallocated_lessons.is_empty();
    RoomAllocationResult {
        success,
        unallocated_lessons,
        assignments: updated_assignments,
    }
}
