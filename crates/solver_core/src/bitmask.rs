#[inline(always)]
pub fn slot_mask(slot: u8, duration: u8) -> u64 {
    if duration <= 1 {
        1u64 << slot
    } else if duration == 2 {
        (3u64) << slot
    } else {
        ((1u64 << duration) - 1) << slot
    }
}

#[inline(always)]
pub fn crosses_day_boundary(slot: u8, duration: u8, periods_per_day: u8) -> bool {
    let period = slot % periods_per_day;
    period + duration > periods_per_day
}

#[inline(always)]
pub fn build_unavailability_mask(slots: &[u8]) -> u64 {
    let mut mask = 0u64;
    for &s in slots {
        if s < 64 {
            mask |= 1u64 << s;
        }
    }
    mask
}

#[inline(always)]
pub fn day_mask(day: u8, periods_per_day: u8) -> u64 {
    let day_len = periods_per_day as u64;
    let base = if day_len >= 64 {
        !0u64
    } else {
        (1u64 << day_len) - 1
    };
    base << ((day as u64) * day_len)
}

#[inline(always)]
pub fn extract_day_bits(schedule: u64, day: u8, periods_per_day: u8) -> u64 {
    let shift = (day as u64) * (periods_per_day as u64);
    let mask = if periods_per_day >= 64 {
        !0u64
    } else {
        (1u64 << periods_per_day) - 1
    };
    (schedule >> shift) & mask
}

#[inline(always)]
pub fn count_day_gaps(day_bits: u64) -> u32 {
    if day_bits == 0 {
        return 0;
    }
    let first = day_bits.trailing_zeros();
    let last = 63 - day_bits.leading_zeros();
    let count = day_bits.count_ones();
    let span = last - first + 1;
    span.saturating_sub(count)
}

#[inline(always)]
pub fn max_consecutive_ones(mut day_bits: u64) -> u8 {
    let mut count = 0u8;
    while day_bits != 0 {
        day_bits &= day_bits << 1;
        count += 1;
    }
    count
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slot_mask() {
        assert_eq!(slot_mask(0, 1), 1);
        assert_eq!(slot_mask(1, 1), 2);
        assert_eq!(slot_mask(0, 2), 3);
        assert_eq!(slot_mask(3, 2), 0b11000);
    }

    #[test]
    fn test_crosses_day_boundary() {
        assert!(!crosses_day_boundary(0, 1, 7));
        assert!(!crosses_day_boundary(5, 2, 7));
        assert!(crosses_day_boundary(6, 2, 7)); // period 6 with duration 2 exceeds 7
    }

    #[test]
    fn test_count_day_gaps() {
        assert_eq!(count_day_gaps(0), 0);
        assert_eq!(count_day_gaps(0b0000001), 0); // 1 period
        assert_eq!(count_day_gaps(0b0000111), 0); // 3 consecutive
        assert_eq!(count_day_gaps(0b0000101), 1); // 1 gap between period 0 and 2
        assert_eq!(count_day_gaps(0b0010001), 3); // 3 gaps between 0 and 4
    }

    #[test]
    fn test_max_consecutive_ones() {
        assert_eq!(max_consecutive_ones(0), 0);
        assert_eq!(max_consecutive_ones(0b0000001), 1);
        assert_eq!(max_consecutive_ones(0b0011100), 3);
        assert_eq!(max_consecutive_ones(0b0110111), 3);
        assert_eq!(max_consecutive_ones(0b1111111), 7);
    }
}
